import mascotWorried from '../assets/mascot-worried-new.png'
import mascotHands from '../assets/Adobe Express - file.png'

export function MascotWorried({ className }) {
  return (
    <img
      src={mascotWorried.src}
      alt="ABRI mascot, worried and sweating"
      className={`pixel-crisp w-100 select-none ${className || ''}`}
      draggable={false}
    />
  )
}

export function MascotHandsPeek({ className }) {
  return (
    <img
      src={mascotHands.src}
      alt="ABRI mascot peeking over the edge"
      className={`pixel-crisp w-full select-none ${className || ''}`}
      draggable={false}
    />
  )
}

export function MascotPeek({ className }) {
  return (
    <div
      role="img"
      aria-label="ABRI mascot peeking"
      className={`pixel-crisp w-full ${className || ''}`}
      style={{
        aspectRatio: '1 / 0.37',
        backgroundImage: `url(${mascotWorried.src})`,
        backgroundSize: 'cover',
        backgroundPosition: '25% 48%',
      }}
    />
  )
}
