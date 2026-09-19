# -*- coding: utf-8 -*-
"""
Импорт курса из выгрузки netacad-extractor в контент CyberPath.

Вход:  <repo>/../netacad-solver-master/cyberpath-data/out/modules/*.json
Выход: src/content/auto/manifest.json  — лёгкий список модулей и островов
       src/content/auto/m<N>.json      — уроки и вопросы одного модуля

Ручные острова (1.1, 1.2, 2.1) в выход не попадают: они живут в .ts и главнее.
"""
import json, os, re, sys, glob, collections

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/mnt/modules')
DST = sys.argv[2] if len(sys.argv) > 2 else 'src/content/auto'
HAND = {'1.1', '1.2', '2.1'}          # острова, собранные вручную
SKIP_COMPONENTS = {'assessmentResults'}

os.makedirs(DST, exist_ok=True)

def txt(s):
    return re.sub(r'[ \t]+', ' ', (s or '')).strip()

def paras(body):
    """Тело блока в абзацы и списки."""
    out = []
    buf = []
    for raw in (body or '').split('\n'):
        line = txt(raw)
        if not line:
            continue
        if line.startswith(('•', '-', '–')):
            buf.append(line.lstrip('•-– ').strip())
        else:
            if buf:
                out.append({'t': 'list', 'items': buf}); buf = []
            out.append({'t': 'p', 'md': line})
    if buf:
        out.append({'t': 'list', 'items': buf})
    return out

def sections_to_block(b):
    secs = b.get('sections') or []
    items = []
    for s in secs:
        head = txt(s.get('heading')) or txt(s.get('title')) or '—'
        items.append({'title': head, 'md': txt((s.get('body') or '').replace('\n', ' '))})
    return {'t': 'accordion', 'items': items} if items else None

NUM = re.compile(r'^(\d+)\.(\d+)(?:\.(\d+))?\b\s*(.*)$')

def parse_title(t):
    """'3.1.2 The IPv4 Packet Header' -> ('3.1', '3.1.2', 'The IPv4 Packet Header')"""
    m = NUM.match(txt(t))
    if not m:
        return None, None, txt(t)
    mod, sub, sub2, rest = m.group(1), m.group(2), m.group(3), m.group(4)
    island = f'{mod}.{sub}'
    lesson = f'{island}.{sub2}' if sub2 else island
    return island, lesson, rest.strip()

def opt_list(options):
    o = [txt(x.get('text')) for x in options if txt(x.get('text'))]
    a = [txt(x.get('text')) for x in options if x.get('correct') and txt(x.get('text'))]
    return o, a

def question_to_quiz(b):
    """Вопрос курса -> данные для упражнения. None, если не проверяемый."""
    qt = b.get('qtype')
    prompt = txt((b.get('prompt') or b.get('body') or '').replace('\n', ' '))
    if qt == 'mcq':
        o, a = opt_list(b.get('options') or [])
        if len(o) < 2 or not a:
            return None
        return {'type': 'multi' if (b.get('multi') or len(a) > 1) else 'mcq', 'q': prompt, 'options': o, 'answers': a}
    if qt in ('dropdownSelect', 'tableDropdown'):
        rows, pool = [], []
        for r in b.get('rows') or []:
            o, a = opt_list(r.get('options') or [])
            if not a:
                continue
            rows.append({'item': txt(r.get('text')) or f'строка {len(rows) + 1}', 'match': a[0]})
            for x in o:
                if x not in pool:
                    pool.append(x)
        if len(rows) < 2 or len(pool) < 2:
            return None
        return {'type': 'select', 'q': prompt, 'pairs': rows, 'pool': pool}
    if qt == 'match':
        pairs = [{'item': txt(p.get('left')), 'match': txt(p.get('right'))} for p in (b.get('pairs') or [])]
        pairs = [p for p in pairs if p['item'] and p['match']]
        if len(pairs) < 2:
            return None
        return {'type': 'match', 'q': prompt, 'pairs': pairs}
    if qt == 'yesNo':
        lab = b.get('labels') or {}
        yes, no = txt(lab.get('yes')) or 'Да', txt(lab.get('no')) or 'Нет'
        rows = [{'item': txt(s.get('label')), 'match': yes if s.get('answer') else no}
                for s in (b.get('statements') or []) if txt(s.get('label'))]
        if len(rows) < 2:
            return None
        return {'type': 'select', 'q': prompt, 'pairs': rows, 'pool': [yes, no]}
    if qt == 'fillBlanks':
        rows, pool = [], []
        for i, bl in enumerate(b.get('blanks') or []):
            o, a = opt_list(bl.get('options') or [])
            if not a:
                continue
            label = txt((txt(bl.get('pre')) + ' ___ ' + txt(bl.get('post'))).strip()) or f'пропуск {i + 1}'
            rows.append({'item': label, 'match': a[0]})
            for x in o:
                if x not in pool:
                    pool.append(x)
        if len(rows) < 2 or len(pool) < 2:
            return None
        return {'type': 'select', 'q': prompt, 'pairs': rows, 'pool': pool}
    return None


def block_to_content(b):
    """Концептуальный блок -> блоки теории приложения."""
    comp = b.get('component')
    body = b.get('body') or ''
    out = []

    if comp in ('accordion', 'hotgraphic', 'narrative', 'tabs', 'stacker'):
        if txt(body):
            out += paras(body)
        sec = sections_to_block(b)
        if sec:
            out.append(sec)
        return out

    if comp == 'flipcard':
        if txt(body):
            out += paras(body)
        cards = []
        for c in b.get('cards') or []:
            front = txt(c.get('front') or c.get('title') or c.get('heading'))
            back = txt((c.get('back') or c.get('body') or '').replace('\n', ' '))
            if front and back:
                cards.append({'front': front, 'back': back})
        if cards:
            out.append({'t': 'flip', 'cards': cards})
        return out

    if comp in ('graphic', 'dynamic-graphic', 'hotgraphic'):
        if txt(body):
            out += paras(body)
        if not txt(body):
            out.append({'t': 'figure', 'caption': txt(b.get('title')) or 'схема из курса'})
        return out

    if comp == 'media':
        out.append({'t': 'note', 'variant': 'info', 'title': 'Видео курса',
                    'md': (txt(b.get('title')) or 'видео') + '. Само видео в выгрузку не попало.'})
        if txt(body):
            out += paras(body)
        return out

    if comp in ('pageTracer', 'packetTracer'):
        out.append({'t': 'note', 'variant': 'info', 'title': 'Packet Tracer',
                    'md': (txt(b.get('title')) or 'активность') + '. Файл активности в выгрузку не попал.'})
        if txt(body):
            out += paras(body)
        return out

    if comp in ('commandWindow', 'syntax-checker', 'adobe-animate'):
        if txt(body):
            out += paras(body)
        else:
            out.append({'t': 'figure', 'caption': txt(b.get('title')) or 'интерактив из курса'})
        return out

    if comp == 'openTableTextBox':
        rows = b.get('rows') or []
        ans = b.get('answers') or []
        if txt(b.get('prompt')):
            out += paras(b.get('prompt'))
        if txt(body):
            out += paras(body)
        items = []
        for i, r in enumerate(rows):
            q = txt(r.get('text') if isinstance(r, dict) else r)
            a = txt(ans[i] if i < len(ans) else '')
            if q:
                items.append({'title': q, 'md': a or 'ответ в выгрузку не попал'})
        if items:
            out.append({'t': 'accordion', 'title': 'Ответы курса', 'items': items})
        elif ans:
            out.append({'t': 'note', 'variant': 'tip', 'title': 'Ответ курса',
                        'md': ' '.join(txt(a) for a in ans)})
        return out

    # text, table и всё остальное
    return paras(body)


def build_module(path):
    blocks = json.load(open(path, encoding='utf-8'))
    if not blocks:
        return None
    mod = blocks[0].get('module')
    mtitle = txt(blocks[0].get('moduleTitle'))
    if mod is None:
        return None

    islands = collections.OrderedDict()   # id -> {'title', 'lessons': OrderedDict, 'quiz': []}
    cur_island = cur_lesson = None
    qn = 0

    def island(iid, title=None):
        if iid not in islands:
            islands[iid] = {'id': iid, 'title': title or '', 'lessons': collections.OrderedDict(), 'quiz': []}
        elif title and not islands[iid]['title']:
            islands[iid]['title'] = title
        return islands[iid]

    for b in blocks:
        if b.get('component') in SKIP_COMPONENTS:
            continue
        iid, lid, rest = parse_title(b.get('title'))

        if iid:
            cur_island = iid
            isl = island(iid)
            if lid == iid:                       # заголовок самого острова
                isl['title'] = isl['title'] or rest
                if b.get('kind') != 'question' and txt(b.get('body')) in ('', 'Scroll to begin'):
                    continue
                lid = iid + '.0'
            cur_lesson = lid
        else:
            if cur_island is None:
                continue
            isl = islands[cur_island]
            lid = cur_lesson

        if b.get('kind') == 'question':
            quiz = question_to_quiz(b)
            if quiz:
                qn += 1
                quiz['id'] = f'{cur_island}-q{qn}'
                quiz['lesson'] = lid or cur_island
                if not quiz['q']:
                    quiz['q'] = rest or 'Вопрос курса'
                fb = b.get('feedback') or {}
                why = txt((fb.get('correct') or '').replace('\n', ' '))
                if why:
                    quiz['why'] = why
                isl['quiz'].append(quiz)
            continue

        content = block_to_content(b)
        if not content:
            continue
        # выгрузка часто дублирует заголовок блока отдельным абзацем
        head = txt(b.get('title'))
        content = [c for c in content if not (c.get('t') == 'p' and txt(c.get('md')) == head)]
        if not content:
            continue
        lessons = isl['lessons']
        if lid not in lessons:
            lessons[lid] = {'id': lid, 'title': rest or txt(b.get('title')) or lid, 'blocks': []}
        elif rest and not NUM.match(txt(b.get('title'))):
            content = [{'t': 'h', 'text': txt(b.get('title'))}] + content
        lessons[lid]['blocks'] += content

    out = {'module': mod, 'title': mtitle, 'islands': []}
    for iid, isl in islands.items():
        lessons = [l for l in isl['lessons'].values() if l['blocks']]
        if not lessons and not isl['quiz']:
            continue
        out['islands'].append({
            'id': iid,
            'title': isl['title'] or f'Раздел {iid}',
            'lessons': lessons,
            'quiz': isl['quiz'],
        })
    return out


def main():
    manifest = {'modules': []}
    for path in sorted(glob.glob(os.path.join(SRC, '*.json'))):
        data = build_module(path)
        if not data or not data['islands']:
            continue
        data['islands'] = [i for i in data['islands'] if i['id'] not in HAND]
        if not data['islands']:
            continue
        n = data['module']
        json.dump(data, open(os.path.join(DST, f'm{n}.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, separators=(',', ':'))
        manifest['modules'].append({
            'id': n,
            'title': data['title'],
            'islands': [{'id': i['id'], 'title': i['title'],
                         'lessons': len(i['lessons']),
                         'atoms': [q['id'] for q in i['quiz']]} for i in data['islands']],
        })
        print(f"m{n:<3} {data['title'][:46]:48s} островов {len(data['islands']):2d}  "
              f"уроков {sum(len(i['lessons']) for i in data['islands']):3d}  "
              f"вопросов {sum(len(i['quiz']) for i in data['islands']):3d}")
    json.dump(manifest, open(os.path.join(DST, 'manifest.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    tot = sum(sum(len(i['atoms']) for i in m['islands']) for m in manifest['modules'])
    print(f"\nмодулей {len(manifest['modules'])}, вопросов всего {tot}")

main()
