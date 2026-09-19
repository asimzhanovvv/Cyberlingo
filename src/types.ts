/* ======================================================================
   Модель контента CyberPath
   ----------------------------------------------------------------------
   Module  -> Island (подраздел курса, напр. 1.1) -> Lesson (1.1.1 ...)
   Атомы (Atom) живут на уровне острова и ссылаются на урок, из которого
   они взяты. Один атом разворачивается движком в несколько форматов
   заданий, поэтому один термин зубрится карточкой, выбором, пропуском,
   вводом, парами и сортировкой.
   ====================================================================== */

/* ----------------------------- теория ------------------------------- */

export type Block =
  | { t: 'p'; md: string }
  | { t: 'h'; text: string }
  | { t: 'def'; term: string; md: string }
  | { t: 'note'; variant: 'tip' | 'warn' | 'info' | 'avatar' | 'exam'; title?: string; md: string }
  | { t: 'list'; ordered?: boolean; items: string[] }
  | { t: 'table'; headers: string[]; rows: string[][]; caption?: string }
  | { t: 'flip'; title?: string; cards: { front: string; back: string }[] }
  | { t: 'accordion'; title?: string; items: { title: string; md: string; example?: string }[] }
  | { t: 'carousel'; title?: string; slides: { title: string; md: string }[] }
  | { t: 'figure'; caption: string }
  | { t: 'transcript'; title?: string; lines: { time?: string; text: string }[] }
  | {
      t: 'activity'
      title: string
      prompt: string
      options: string[]
      items: { q: string; a: string; why?: string }[]
      feedback?: string
    }

export type LessonKind =
  | 'text' | 'flip' | 'accordion' | 'carousel' | 'activity'
  | 'video' | 'lab' | 'summary' | 'glossary'

export interface Lesson {
  id: string          // "1.1.1"
  title: string
  titleRu?: string
  kind: LessonKind
  blocks: Block[]
}

/* ------------------------- атомы знаний ----------------------------- */

export type AtomKind =
  | 'term'      // термин <-> определение
  | 'fact'      // факт-вопрос с одним коротким ответом
  | 'enum'      // перечисление: выбрать все верные пункты
  | 'bucket'    // классификация: отнести к категории
  | 'quiz'      // готовый вопрос курса, формат менять нельзя

/** Вопрос, выгруженный из курса как есть. */
export interface QuizPayload {
  type: 'mcq' | 'multi' | 'match' | 'select'
  q: string
  options?: string[]
  answers?: string[]
  pairs?: { item: string; match: string }[]
  pool?: string[]
  why?: string
}

export interface Atom {
  id: string
  lesson: string           // id урока, откуда взят (кнопка "читать теорию")
  kind: AtomKind
  /** Термин или короткая формулировка вопроса. Для term это EN-термин. */
  term: string
  /** Полное определение или ответ (EN, дословно по курсу). */
  definition: string
  /** Пул для подбора дистракторов, пар и сортировки. */
  group: string
  /** Человекочитаемое имя пула (для заголовков в match/bucket). */
  groupLabel?: string
  /** Русская подсказка. Показывается в карточках и после ошибки. */
  ru?: string
  /** Определение с ___ на месте ключевой фразы (для "дополни предложение"). */
  cloze?: string
  /** Правильная вставка в ___. По умолчанию term. */
  clozeAnswer?: string
  /** Дополнительные ложные варианты именно для этого атома. */
  decoys?: string[]
  /** Для kind: 'enum' — верные пункты списка. */
  items?: string[]
  /** Для kind: 'bucket' — верная корзина. */
  bucket?: string
  /** Допустимые варианты при вводе с клавиатуры. */
  aliases?: string[]
  /** 3 — почти наверняка на экзамене, 1 — фоновый факт. */
  weight?: 1 | 2 | 3
  /** Только для kind: 'quiz'. Готовый вопрос курса. */
  quiz?: QuizPayload
}

/* ---------------------------- острова ------------------------------- */

export interface Island {
  id: string            // "1.1"
  moduleId: number
  title: string         // EN, как в курсе
  titleRu: string
  objective: string
  icon: string          // имя иконки lucide
  lessons: Lesson[]
  atoms: Atom[]
}

export interface Module {
  id: number
  title: string
  titleRu: string
  color: 'primary' | 'violet' | 'accent' | 'success' | 'danger'
  islands: Island[]
}

/* --------------------------- упражнения ----------------------------- */

/** Как засчитан ответ: с первого раза, во втором заходе, или провален дважды. */
export type Grade = 'first' | 'retry' | 'failed'

export type ExerciseFormat =
  | 'quiz'
  | 'stack'
  | 'flashcard'
  | 'mcq_term'     // определение -> выбрать термин
  | 'mcq_def'      // термин -> выбрать определение
  | 'cloze'        // дополни предложение
  | 'type'         // ввод с клавиатуры
  | 'truefalse'
  | 'match'        // сопоставь пары
  | 'bucket'       // разложи по категориям
  | 'select'       // то же, но выбором из выпадающего списка в каждой строке
  | 'multi'        // выбери все верные

export interface ExerciseBase {
  key: string
  format: ExerciseFormat
  atomIds: string[]
  prompt: string
  hint?: string
  lesson: string
}

export interface ChoiceExercise extends ExerciseBase {
  format: 'mcq_term' | 'mcq_def' | 'cloze' | 'truefalse'
  question: string
  options: string[]
  answer: string
  explain?: string
}

export interface StackExercise extends ExerciseBase {
  format: 'stack'
  cards: { atomId: string; front: string; back: string; ru?: string }[]
}

export interface FlashcardExercise extends ExerciseBase {
  format: 'flashcard'
  front: string
  back: string
  ru?: string
}

export interface TypeExercise extends ExerciseBase {
  format: 'type'
  question: string
  answer: string
  accepted: string[]
  explain?: string
}

export interface MatchExercise extends ExerciseBase {
  format: 'match'
  pairs: { id: string; left: string; right: string }[]
}

export interface BucketExercise extends ExerciseBase {
  /** select это та же задача, но с длинными формулировками: список у каждой строки. */
  format: 'bucket' | 'select'
  buckets: string[]
  cards: { id: string; text: string; bucket: string }[]
}

export interface MultiExercise extends ExerciseBase {
  format: 'multi'
  question: string
  options: string[]
  answers: string[]
  explain?: string
}

export type Exercise =
  | ChoiceExercise | FlashcardExercise | StackExercise | TypeExercise
  | MatchExercise | BucketExercise | MultiExercise

/* ---------------------------- прогресс ------------------------------ */

export interface AtomProgress {
  m: number          // мастерство 0..5
  due: number        // timestamp следующего показа
  right: number
  wrong: number
  seen: number
  u: number          // updated_at
}

export interface IslandResult {
  best: number       // лучший процент за экзамен острова
  attempts: number
  passed: boolean
  u: number
}
