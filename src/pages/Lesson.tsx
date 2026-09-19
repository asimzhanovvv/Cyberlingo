import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Loader2, Target } from 'lucide-react'
import { ensureIsland, getLesson, useContentVersion } from '@/content'
import { useProgress } from '@/store/progress'
import { Blocks } from '@/components/blocks/BlockRenderer'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function LessonPage() {
  const { id = '' } = useParams()
  useContentVersion()
  const [loading, setLoading] = useState(true)
  const found = getLesson(id)
  const nav = useNavigate()
  const markRead = useProgress((s) => s.markRead)
  const read = useProgress((s) => !!s.lessonsRead[id])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [id])
  useEffect(() => {
    setLoading(true)
    void ensureIsland(id.split('.').slice(0, 2).join('.')).finally(() => setLoading(false))
  }, [id])

  if (!found) {
    return loading
      ? <div className="flex min-h-40 items-center justify-center gap-2 text-muted"><Loader2 size={18} className="animate-spin" aria-hidden /> Загружаю урок</div>
      : <p className="text-muted">Подраздел не найден.</p>
  }
  const { lesson, island } = found
  const idx = island.lessons.findIndex((l) => l.id === lesson.id)
  const prev = island.lessons[idx - 1]
  const next = island.lessons[idx + 1]

  return (
    <article className="space-y-5">
      <Link to={`/island/${island.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden /> {island.id} {island.titleRu}
      </Link>

      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{lesson.id}</p>
        <h1 className="font-display text-2xl font-black leading-tight">{lesson.titleRu ?? lesson.title}</h1>
        {lesson.titleRu && lesson.titleRu !== lesson.title && <p className="text-sm text-muted">{lesson.title}</p>}
      </header>

      <Blocks blocks={lesson.blocks} />

      <Card className="space-y-3">
        <Button
          full size="lg" variant={read ? 'surface' : 'success'} icon={<Check size={18} />}
          onClick={() => { markRead(lesson.id); if (next) nav(`/lesson/${next.id}`) }}
        >
          {read ? 'Прочитано' : 'Отметить прочитанным'}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="surface" disabled={!prev} onClick={() => prev && nav(`/lesson/${prev.id}`)} icon={<ArrowLeft size={16} />}>Назад</Button>
          <Button variant="surface" disabled={!next} onClick={() => next && nav(`/lesson/${next.id}`)}>
            Дальше <ArrowRight size={16} />
          </Button>
        </div>
        <Button full variant="ghost" icon={<Target size={16} />} onClick={() => nav(`/session/learn/${island.id}`)}>
          Перейти к тренировке раздела
        </Button>
      </Card>
    </article>
  )
}
