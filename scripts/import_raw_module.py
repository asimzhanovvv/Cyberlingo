# -*- coding: utf-8 -*-
"""
Импорт одного модуля напрямую из сырой выгрузки NetAcad (Adapt) в контент Cyberlingo.

Зачем отдельно от import-course.py: старый путь шёл через cyberpath-data/out/modules,
где заголовки приходили с плейсхолдером {{_moduleNumber}} и потому не разбирались.
Из-за этого абзацы без номера прилипали к предыдущему уроку, а куски, лежащие
в выгрузке после итогового теста (лабы Packet Tracer), уезжали в раздел "Итоги".

Здесь номер подраздела восстанавливается по порядку компонентов:

  1. номерной заголовок вперёд     -> начинается новый урок
  2. номерной заголовок назад      -> ошибка разметки курса, остаёмся в текущем уроке
  3. без номера, но есть дырка
     между текущим и следующим     -> заполняем дырку (это и есть пропавший подраздел)
  4. без номера, заголовок совпал
     со следующим номерным         -> это вводная картинка к нему, отдаём вперёд
  5. иначе                         -> продолжение текущего урока
  6. хвост после итогового теста   -> раздаём по лабам Packet Tracer, остальное выкидываем

Запуск:  python scripts/import_raw_module.py <raw/NN-course-mN.json> <номер модуля> [src/content/auto]
"""
import json, os, re, sys, html, collections

SKIP_COMPONENTS = {'quicknav', 'blank', 'adaptiveStartScreen', 'assessmentResults', 'openTextBox'}
QUESTION_COMPONENTS = {'mcq', 'matching', 'gmcq', 'textinput', 'slider'}


# ------------------------------- текст -----------------------------------

def strip_html(s):
    if not isinstance(s, str):
        return ''
    s = re.sub(r'<li[^>]*>', '\n• ', s)
    # закрывающие теги тоже дают перенос: иначе соседние элементы склеиваются
    # в одно слово ("1 Module QuizModule Title: ...")
    s = re.sub(r'</p>|<br\s*/?>|</h\d>|</tr>|</li>|</ul>|</ol>|</td>|</th>|</div>|<p[^>]*>',
               '\n', s, flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s).replace('\xa0', ' ')
    s = re.sub(r'[ \t]{2,}', ' ', s)
    return re.sub(r'\n{3,}', '\n\n', s).strip()


def txt(s):
    return re.sub(r'[ \t]+', ' ', (s or '')).strip()


def paras(body):
    """Текст -> абзацы и маркированные списки."""
    out, buf = [], []
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


# ----------------------------- заголовки ---------------------------------

NUM = re.compile(r'^(\d+)\.(\d+)(?:\.(\d+))?\b\s*(.*)$')


def title_of(c, modnum):
    t = txt(c.get('title')).replace('{{_moduleNumber}}', str(modnum))
    return t


def parse_num(t):
    """'6.2.3 ACLs' -> ('6.2', '6.2.3', 3, 'ACLs'); иначе (None, None, None, текст)"""
    m = NUM.match(t)
    if not m:
        return None, None, None, t
    mod, sub, sub2, rest = m.group(1), m.group(2), m.group(3), m.group(4)
    island = f'{mod}.{sub}'
    if sub2:
        return island, f'{island}.{sub2}', int(sub2), rest.strip()
    return island, island, 0, rest.strip()


STOP = {'the', 'a', 'an', 'of', 'and', 'in', 'on', 'for', 'to', 'is', 'are',
        'what', 'using', 'with', 'or', 'as', 'its', 'sample', 'types', 'type'}


def tokens(s):
    return {w for w in re.findall(r'[a-z0-9]+', (s or '').lower()) if w not in STOP and len(w) > 1}


def acronym(s):
    words = [w for w in re.findall(r'[A-Za-z]+', s or '') if w.lower() not in STOP]
    return ''.join(w[0] for w in words).lower() if len(words) >= 2 else ''


def looks_forward(desc, next_title):
    """Заголовок без номера описывает тот же предмет, что и следующий номерной?"""
    if not desc or not next_title:
        return False
    a, b = tokens(desc), tokens(next_title)
    if a & b:
        return True
    ac = acronym(desc)
    return bool(ac and ac in b)


# ------------------------------ вопросы ----------------------------------

def question_type(c):
    items = c.get('_items') or []
    if not items:
        return None
    it = items[0]
    if c.get('_component') == 'accordion':
        return None
    if it.get('text') and it.get('_options'):
        return 'select'
    if isinstance(it.get('_shouldBeSelected'), bool):
        return 'mcq'
    return None


def to_quiz(c, prompt):
    qt = question_type(c)
    items = c.get('_items') or []
    if qt == 'mcq':
        opts = [strip_html(i.get('text')) for i in items if strip_html(i.get('text'))]
        ans = [strip_html(i.get('text')) for i in items if i.get('_shouldBeSelected') and strip_html(i.get('text'))]
        if len(opts) < 2 or not ans:
            return None
        return {'type': 'multi' if len(ans) > 1 else 'mcq', 'q': prompt, 'options': opts, 'answers': ans}
    if qt == 'select':
        rows, pool = [], []
        for i in items:
            correct = [strip_html(o.get('text')) for o in (i.get('_options') or []) if o.get('_isCorrect')]
            every = [strip_html(o.get('text')) for o in (i.get('_options') or []) if strip_html(o.get('text'))]
            if not correct:
                continue
            rows.append({'item': strip_html(i.get('text')) or f'строка {len(rows) + 1}', 'match': correct[0]})
            for x in every:
                if x not in pool:
                    pool.append(x)
        if len(rows) < 2 or len(pool) < 2:
            return None
        return {'type': 'select', 'q': prompt, 'pairs': rows, 'pool': pool}
    return None


def quiz_why(c):
    fb = c.get('_feedback') or {}
    return txt(strip_html(fb.get('correct') or '').replace('\n', ' '))


# ------------------------------ теория -----------------------------------

def norm(s):
    return re.sub(r'[^a-z0-9]+', ' ', (s or '').lower()).strip()


def dup(text, blob):
    """Абзац — это плоский пересказ строк таблицы, а не собственная проза?

    В body таблица часто продублирована текстом, причём соседние ячейки
    склеены. Поэтому сверяем вхождение в ленту ячеек целиком: настоящая
    вводная проза в неё не попадёт, а обрывки таблицы попадут."""
    n = norm(text)
    if not n:
        return True
    return n in blob


def table_block(c):
    rows = []
    for r in c.get('_rows') or []:
        rows.append([strip_html(cell.get('text')) for cell in (r.get('_cells') or [])])
    rows = [r for r in rows if any(x for x in r)]
    if len(rows) < 2:
        return None
    return {'t': 'table', 'headers': rows[0], 'rows': rows[1:]}


def sections_block(c):
    items = []
    for it in c.get('_items') or []:
        head = strip_html(it.get('tabTitle') or it.get('title') or '')
        body = txt(strip_html(it.get('body') or '').replace('\n', ' '))
        if head and body:
            items.append({'title': head, 'md': body})
    return {'t': 'accordion', 'items': items} if items else None


def content_blocks(c, heading):
    comp = c.get('_component')
    body = strip_html(c.get('body') or '')
    out = []

    if comp == 'table':
        tb = table_block(c)
        # у table есть и вводная проза в body, и сами строки в _rows, причём
        # в body строки таблицы часто продублированы плоским текстом
        blob = ''
        if tb:
            blob = ' '.join(norm(cell) for row in [tb['headers']] + tb['rows'] for cell in row)
        for blk in paras(body):
            if blk['t'] == 'p':
                if not dup(blk['md'], blob):
                    out.append(blk)
            else:
                items = [x for x in blk['items'] if not dup(x, blob)]
                if items:
                    out.append({'t': 'list', 'items': items})
        if tb:
            if heading:
                tb['caption'] = heading
            out.append(tb)
        return out

    if comp in ('accordion', 'tabs', 'narrative', 'hotgraphic', 'stacker'):
        if body:
            out += paras(body)
        sec = sections_block(c)
        if sec:
            out.append(sec)
        return out

    if comp == 'media':
        out.append({'t': 'note', 'variant': 'info', 'title': 'Видео курса',
                    'md': (heading or 'видео') + '. Само видео в выгрузку не попало.'})
        if body:
            out += paras(body)
        return out

    if comp in ('pageTracer', 'packetTracer'):
        out.append({'t': 'note', 'variant': 'info', 'title': 'Packet Tracer',
                    'md': (heading or 'активность') + '. Сам файл активности в выгрузку не попал, ниже инструкция из курса.'})
        if body:
            out += paras(body)
        return out

    if comp in ('graphic', 'dynamic-graphic', 'adobe-animate'):
        if body:
            out += paras(body)
        else:
            out.append({'t': 'figure', 'caption': heading or 'схема из курса'})
        return out

    return paras(body)


# --------------------------- раскладка по урокам -------------------------

def plan(raw, modnum):
    """Каждому компоненту -> (island, lesson, lesson_title). None = выкинуть."""
    n = len(raw)

    # где кончается содержательная часть: всё после итогового теста разбираем отдельно
    tail_from = n
    for i, c in enumerate(raw):
        if c.get('_component') == 'assessmentResults':
            tail_from = i
            break

    # номерные якоря по порядку
    nums = []
    for i, c in enumerate(raw):
        isl, les, idx, rest = parse_num(title_of(c, modnum))
        nums.append((isl, les, idx, rest))

    def next_numbered(i):
        for j in range(i + 1, tail_from):
            if nums[j][0]:
                return nums[j]
        return (None, None, None, '')

    out = [None] * n
    titles = {}                 # lesson id -> заголовок
    island_titles = {}
    cur_isl = cur_les = None
    cur_idx = -1

    for i in range(n):
        c = raw[i]
        comp = c.get('_component')
        t = title_of(c, modnum)
        isl, les, idx, rest = nums[i]

        # баннер раздела: даёт имя острову, в теорию не идёт
        if t == 'Text':
            b = strip_html(c.get('body') or '').replace('{{_moduleNumber}}', str(modnum))
            bi, bl, bidx, brest = parse_num(b)
            if bi:
                island_titles[bi] = brest
            continue

        if comp in SKIP_COMPONENTS or i >= tail_from:
            continue

        if isl:
            if les == isl:                       # заголовок самого острова
                island_titles.setdefault(isl, rest)
                cur_isl, cur_les, cur_idx = isl, f'{isl}.0', 0
                continue
            back = (isl == cur_isl and idx < cur_idx)
            if back:
                pass                              # правило 2: ошибка курса, не прыгаем назад
            else:
                cur_isl, cur_les, cur_idx = isl, les, idx
                titles.setdefault(les, rest)
        else:
            if cur_isl is None:
                continue
            nisl, nles, nidx, nrest = next_numbered(i)
            gap = (nisl == cur_isl and nidx is not None and nidx > cur_idx + 1)
            if gap:                               # правило 3: пропавший подраздел
                cur_idx += 1
                cur_les = f'{cur_isl}.{cur_idx}'
                titles.setdefault(cur_les, rest or 'Из курса')
            elif rest and looks_forward(rest, nrest) and nles:   # правило 4
                cur_isl, cur_les, cur_idx = nisl, nles, nidx
                titles.setdefault(nles, nrest)
            # иначе правило 5: молча продолжаем текущий урок

        out[i] = (cur_isl, cur_les, titles.get(cur_les, ''))

    # --- хвост: лабы Packet Tracer, уехавшие в конец выгрузки ---
    labs = []
    for i in range(tail_from):
        if raw[i].get('_component') in ('pageTracer', 'packetTracer'):
            isl, les, idx, rest = nums[i]
            # сверяем и с заголовком лабы, и с её описанием: в хвосте лежит
            # подробная инструкция, и слов заголовка в ней может не быть
            labs.append((isl, les, rest, tokens(rest) | tokens(strip_html(raw[i].get('body') or ''))))
    for i in range(tail_from, n):
        c = raw[i]
        if c.get('_component') in SKIP_COMPONENTS:
            continue
        body = strip_html(c.get('body') or '')
        if not body or body.startswith('\N{COPYRIGHT SIGN}'):
            continue
        btok = tokens(body[:600])
        best, score = None, 0
        for isl, les, rest, ltok in labs:
            s = len(btok & ltok)
            if s > score:
                best, score = (isl, les, rest), s
        if best and score >= 3:
            out[i] = best
            out[i] = best
    return out, island_titles, titles


def build(path, modnum, module_title=None):
    raw = json.load(open(path, encoding='utf-8'))
    placed, island_titles, lesson_titles = plan(raw, modnum)

    islands = collections.OrderedDict()
    qn = 0

    def isl_of(iid):
        if iid not in islands:
            islands[iid] = {'id': iid, 'title': island_titles.get(iid, ''),
                            'lessons': collections.OrderedDict(), 'quiz': []}
        return islands[iid]

    for i, c in enumerate(raw):
        if placed[i] is None:
            continue
        iid, lid, ltitle = placed[i]
        if not iid:
            continue
        isl = isl_of(iid)

        prompt = txt(strip_html(c.get('body') or '').replace('\n', ' '))
        quiz = to_quiz(c, prompt) if c.get('_component') in QUESTION_COMPONENTS else None
        if quiz:
            qn += 1
            quiz['id'] = f'{iid}-q{qn}'
            quiz['lesson'] = lid
            if not quiz['q']:
                quiz['q'] = title_of(c, modnum) or 'Вопрос курса'
            why = quiz_why(c)
            if why:
                quiz['why'] = why
            isl['quiz'].append(quiz)
            continue

        heading = parse_num(title_of(c, modnum))[3]
        blocks = content_blocks(c, heading)
        # курс часто дублирует заголовок отдельным абзацем
        blocks = [b for b in blocks if not (b.get('t') == 'p' and txt(b.get('md')) == heading)]
        if not blocks:
            continue

        lessons = isl['lessons']
        if lid not in lessons:
            lessons[lid] = {'id': lid, 'title': ltitle or heading or lid, 'blocks': []}
        lessons[lid]['blocks'] += blocks

    out = {'module': modnum, 'title': module_title or '', 'islands': []}
    for iid, isl in islands.items():
        lessons = [l for l in isl['lessons'].values() if l['blocks']]
        if not lessons and not isl['quiz']:
            continue
        out['islands'].append({'id': iid, 'title': isl['title'] or f'Раздел {iid}',
                               'lessons': lessons, 'quiz': isl['quiz']})
    return out


def sync_manifest(dst, modnum):
    """Манифест грузится сразу и должен знать про новые уроки и термины."""
    mpath = os.path.join(dst, 'manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8'))
    data = json.load(open(os.path.join(dst, f'm{modnum}.json'), encoding='utf-8'))

    tpath = os.path.join(os.path.dirname(dst), 'terms', f'm{modnum}.json')
    terms = json.load(open(tpath, encoding='utf-8'))['islands'] if os.path.exists(tpath) else {}

    entry = {'id': modnum, 'title': data['title'], 'islands': []}
    for isl in data['islands']:
        entry['islands'].append({
            'id': isl['id'],
            'title': isl['title'],
            'lessons': len(isl['lessons']),
            'atoms': [q['id'] for q in isl['quiz']] + [a['id'] for a in terms.get(isl['id'], [])],
        })

    for i, m in enumerate(manifest['modules']):
        if m['id'] == modnum:
            manifest['modules'][i] = entry
            break
    else:
        manifest['modules'].append(entry)
        manifest['modules'].sort(key=lambda m: m['id'])

    with open(mpath, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    n = sum(len(i['atoms']) for i in entry['islands'])
    print(f'   манифест обновлён: {len(entry["islands"])} островов, {n} атомов')


if __name__ == '__main__':
    src, modnum = sys.argv[1], int(sys.argv[2])
    dst = sys.argv[3] if len(sys.argv) > 3 else 'src/content/auto'
    title = None
    old = os.path.join(dst, f'm{modnum}.json')
    if os.path.exists(old):
        title = json.load(open(old, encoding='utf-8')).get('title')
    data = build(src, modnum, title)
    with open(os.path.join(dst, f'm{modnum}.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f'm{modnum}: {len(data["islands"])} островов, '
          f'{sum(len(i["lessons"]) for i in data["islands"])} уроков, '
          f'{sum(len(i["quiz"]) for i in data["islands"])} вопросов')
    sync_manifest(dst, modnum)
