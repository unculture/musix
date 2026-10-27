import confetti from 'canvas-confetti'

export function celebrate(): void {
  const colors = ['#e8457a', '#ffb627', '#3a9bdc', '#2fb67c', '#8b5cf6', '#ff7a59']
  confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors })
  setTimeout(
    () => confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 }, colors }),
    250
  )
  setTimeout(
    () => confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 }, colors }),
    400
  )
}
