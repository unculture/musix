import { StepScreen } from '@/components/StepScreen'

export const StyleScreen = (): React.JSX.Element => (
  <StepScreen
    step="style"
    title="Pick a style"
    help="What kind of song is it? Pick a picture or tell me."
  />
)
export const HumScreen = (): React.JSX.Element => (
  <StepScreen
    step="hum"
    title="Hum a tune"
    help="Got a tune in your head? Hum it to me! Or skip this bit."
  />
)
export const MakeScreen = (): React.JSX.Element => (
  <StepScreen step="make" title="Make it!" help="Ready? Let's turn your words into music!" />
)
export const PlayScreen = (): React.JSX.Element => (
  <StepScreen step="play" title="Play and sing" help="Press play and sing along!" />
)
