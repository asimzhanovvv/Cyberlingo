import re, json, sys, hashlib

SRC = "/root/.claude/uploads/ba09d08f-c9ee-5cdf-86bc-6fdebb805774/e8de39a3-Question_Bank_Clean_7.md"
src = open(SRC, encoding='utf-8').read()

# отрезаем оглавление
start = src.index('\n## 1. ')
body = src[start:]
chunks = re.split(r'\n## (?=\d+\.\s)', body)

def clean(t):
    t = t.strip()
    t = re.sub(r'\s+', ' ', t)
    return t

out, skipped = [], []
for ch in chunks:
    m = re.match(r'(\d+)\.\s+(.*?)\n', ch)
    if not m: continue
    num = int(m.group(1)); title = clean(m.group(2))
    tm = re.search(r'\*\*Type:\*\*\s*(.+)', ch)
    mm = re.search(r'\*\*Modules:\*\*\s*(.+)', ch)
    if not tm: skipped.append((num,'no type')); continue
    typ = clean(tm.group(1))
    mods = [x.strip() for x in clean(mm.group(1)).split(',')] if mm else []
    mods = [x for x in mods if x and x != 'Pasted JSON']

    q = {'n': num, 'q': title, 'modules': mods}

    if typ.startswith('Multiple Choice'):
        opts = re.findall(r'^-\s+([A-Z])\.\s+(.*?)\s*$', ch, re.M)
        if not opts: skipped.append((num,'no options')); continue
        choices, answers = [], []
        for letter, text in opts:
            correct = '**✓**' in text
            text = clean(text.replace('**✓**','').strip())
            if not text: continue
            choices.append(text)
            if correct: answers.append(text)
        if not answers:
            # запасной путь: блок "Correct Answer"
            for a in re.findall(r'^\*\*([A-Z])\.\s+(.*?)\*\*\s*$', ch, re.M):
                answers.append(clean(a[1]))
        if not choices or not answers: skipped.append((num,'no answer')); continue
        q['type'] = 'multi' if len(answers) > 1 else 'mcq'
        q['options'] = choices
        q['answers'] = answers

    elif typ.startswith('Matching'):
        rows = re.findall(r'^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|(?:\s*(.+?)\s*\|)?\s*$', ch, re.M)
        pairs, pool = [], []
        for r in rows:
            item = clean(r[1]); match = clean(r[2]).replace('**','')
            if not item or not match: continue
            pairs.append({'item': item, 'match': match})
            if r[3]:
                for x in r[3].split(';'):
                    x = clean(x)
                    if x and x not in pool: pool.append(x)
        # пул это объединение всех выпадающих списков плюс сами верные ответы
        for p in pairs:
            if pool and p['match'] not in pool: pool.append(p['match'])
        if len(pairs) < 2: skipped.append((num,'few pairs')); continue
        if 'Dropdown' in typ and pool:
            q['type'] = 'dropdown'; q['pairs'] = pairs; q['pool'] = pool
        else:
            q['type'] = 'match'; q['pairs'] = pairs
    else:
        skipped.append((num, typ)); continue

    out.append(q)

# дедупликация по тексту вопроса и ответу
seen, uniq = set(), []
for q in out:
    body_key = json.dumps(q.get('answers') or q.get('pairs'), ensure_ascii=False, sort_keys=True)
    k = hashlib.md5((q['q'] + '|' + body_key).encode()).hexdigest()
    if k in seen:
        # объединяем теги модулей в уже добавленный вопрос
        for u in uniq:
            if u['_k'] == k:
                u['modules'] = sorted(set(u['modules']) | set(q['modules']))
                break
        continue
    seen.add(k); q['_k'] = k; uniq.append(q)

for i, q in enumerate(uniq, 1):
    q['id'] = 'b%d' % q['n']
    del q['_k']

json.dump(uniq, open('bank.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))

from collections import Counter
print('распознано:', len(out), '| после дедупа:', len(uniq), '| пропущено:', len(skipped))
print('типы:', Counter(q['type'] for q in uniq))
print('пропуски:', Counter(s[1] for s in skipped).most_common(8))
mc = Counter()
for q in uniq:
    for m in q['modules']: mc[m]+=1
    if not q['modules']: mc['(без тега)']+=1
def key(k):
    if k.startswith('M'): return (0,int(k[1:]))
    if k.startswith('Q'): return (1,int(k[1:]))
    if k=='end': return (2,0)
    if k=='F1': return (3,0)
    return (4,0)
print('группы:', ' '.join('%s=%d'%(k,mc[k]) for k in sorted(mc,key=key)))
