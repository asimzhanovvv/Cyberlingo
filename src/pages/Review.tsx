import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Loader2, Sparkles, TrendingUp } from 'lucide-react'
import { allAtomIds, allAtoms, ensureModules, islandMetaById, modulesOfAtoms, useContentVersion } from '@/content'
import { weakAtoms } from '@/engine/session'
import { useProgress } from '@/store/progress'
import { Card, Chip } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Bar } from '@/components/ui/Ring'
import { plural } from '@/lib/utils'

export default function Review() {
  const progress = useProgress((s) => s.atoms)
  const nav = useNavigate()
  useContentVersion()
  const [loading, setLoading] = useState(true)

  const touched = Object.keys(progress)
  const seen = touched.filter((id) => progress[id]?.seen).length

  useEffect(() => {
    setLoading(true)
    void ensureModules(modulesOfAtoms(touched)).finally(() => setLoading(false))
    // список изучённых атомов меняется редко, поэтому считаем по его длине
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touched.length])

  const weak = weakAtoms({ atoms: allAtoms(), progress }, 40)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black leading-tight">Слабые места</h1>
        <p className="mt-1 text-sm text-muted">Вопросы, в которых ты чаще ошибался или которые ещё не закрепились.</p>
      </div>

      {seen === 0 ? (
        <Card className="space-y-3 text-center">
          <Sparkles size={24} className="mx-auto text-muted" aria-hidden />
          <p className="text-sm text-muted">Пока нет данных. Пройди первый раздел, и здесь появится список того, что стоит подтянуть.</p>
          <Button onClick={() => nav('/')}>На карту</Button>
        </Card>
      ) : loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-muted">
          <Loader2 size={18} className="animate-spin" aria-hidden /> Загружаю разделы
        </div>
      ) : weak.length === 0 ? (
        <Card className="space-y-2 text-center">
          <TrendingUp size={24} className="mx-auto text-success" aria-hidden />
          <p className="text-sm text-muted">Слабых мест нет: всё пройденное закреплено минимум на третий уровень.</p>
        </Card>
      ) : (
        <>
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Chip className="border-danger/50 text-danger">{weak.length} {plural(weak.length, 'вопрос', 'вопроса', 'вопросов')}</Chip>
              <Chip>изучено {seen} из {allAtomIds.length}</Chip>
            </div>
            <Button full size="lg" icon={<Sparkles size={18} />} onClick={() => nav('/session/review/all')}>
              Прогнать слабые места
            </Button>
          </Card>

          <div className="space-y-2">
            {weak.map(({ atom, p }) => {
              const meta = islandMetaById.get(atom.lesson.split('.').slice(0, 2).join('.'))
              return (
                <Card key={atom.id} className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-[15px] font-bold text-text">{atom.term}</p>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-danger">{p.wrong}/{p.seen}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted line-clamp-4">{atom.definition}</p>
                  {atom.ru && <p className="mt-1 text-xs text-primary/80 line-clamp-3">{atom.ru}</p>}
                  <Bar value={p.m / 5} className="mt-2 h-2" color={p.m >= 3 ? 'var(--success)' : 'var(--danger)'} />
                  <Link to={`/lesson/${atom.lesson}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                    <BookOpen size={13} aria-hidden /> {meta?.title ?? ''} · {atom.lesson}
                  </Link>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
