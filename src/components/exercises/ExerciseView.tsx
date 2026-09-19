import { ChoiceView, MultiView, TypeView } from './Choice'
import { FlashcardView, StackView } from './Cards'
import { MatchView } from './Match'
import { BucketView } from './Bucket'
import { SelectView } from './Select'
import type { ExerciseProps } from './shared'

export type { ExerciseProps }

export function ExerciseView(props: ExerciseProps) {
  switch (props.ex.format) {
    case 'stack': return <StackView {...props} />
    case 'flashcard': return <FlashcardView {...props} />
    case 'type': return <TypeView {...props} />
    case 'match': return <MatchView {...props} />
    case 'bucket': return <BucketView {...props} />
    case 'select': return <SelectView {...props} />
    case 'multi': return <MultiView {...props} />
    default: return <ChoiceView {...props} />
  }
}
