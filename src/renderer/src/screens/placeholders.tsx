import { StepScreen } from '@/components/StepScreen'

export const HumScreen = (): React.JSX.Element => (
  <StepScreen
    step="hum"
    title="Hum a tune"
    help="Got a tune in your head? Hum it to me! Or skip this bit."
  />
)
export const PlayScreen = (): React.JSX.Element => (
  <StepScreen step="play" title="Play and sing" help="Press play and sing along!" />
)
