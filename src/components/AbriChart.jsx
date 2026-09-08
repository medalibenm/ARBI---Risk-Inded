import { useMemo, useState } from 'react'
import { chartData, xAxisLabels } from '../data/chartData'

const WIDTH = 720
const HEIGHT = 220
const PAD_LEFT = 4
const PAD_RIGHT = 4
const Y_TICKS = [0, 25, 50, 75, 100]

function xFor(i) {
  const usable = WIDTH - PAD_LEFT - PAD_RIGHT
  return PAD_LEFT + (i / (chartData.length - 1)) * usable
}

function yFor(value) {
  return HEIGHT - (value / 100) * HEIGHT
}

export default function AbriChart() {
  const [hover, setHover] = useState(null)

  const points = useMemo(
    () => chartData.map((d, i) => ({ ...d, x: xFor(i), y: yFor(d.value) })),
    []
  )

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT} L ${points[0].x} ${HEIGHT} Z`

  const last = points[points.length - 1]

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH
    let closest = 0
    let bestDist = Infinity
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX)
      if (dist < bestDist) {
        bestDist = dist
        closest = i
      }
    })
    setHover(closest)
  }

  return (
    <div className="w-full">
      <div className="flex gap-3">
        <div className="flex flex-col justify-between py-0 text-xs text-muted-foreground" style={{ height: HEIGHT }}>
          {Y_TICKS.slice()
            .reverse()
            .map((t) => (
              <span key={t}>{t}</span>
            ))}
        </div>

        <div className="relative flex-1">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            width="100%"
            height={HEIGHT}
            className="overflow-visible"
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
          >
            {Y_TICKS.map((t) => (
              <line
                key={t}
                x1={0}
                x2={WIDTH}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            ))}

            <path d={areaPath} fill="var(--destructive)" opacity="0.12" />
            <path d={linePath} fill="none" stroke="var(--destructive)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {points.slice(0, -1).map((p, i) => (
              <rect key={i} x={p.x - 1.5} y={p.y - 1.5} width="3" height="3" fill="var(--destructive)" />
            ))}

            <circle cx={last.x} cy={last.y} r="6" fill="var(--background)" stroke="var(--destructive)" strokeWidth="2.5" />

            {hover !== null && (
              <line
                x1={points[hover].x}
                x2={points[hover].x}
                y1={0}
                y2={HEIGHT}
                stroke="var(--foreground)"
                strokeOpacity="0.15"
                strokeWidth="1"
              />
            )}
            {hover !== null && (
              <circle cx={points[hover].x} cy={points[hover].y} r="4" fill="var(--foreground)" />
            )}
          </svg>

          {hover !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background"
              style={{
                left: `${(points[hover].x / WIDTH) * 100}%`,
                top: `${(points[hover].y / HEIGHT) * 100}%`,
                marginTop: -8,
              }}
            >
              <div className="font-semibold">{points[hover].date}</div>
              <div className="text-background/70">{points[hover].value} / 100</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-between pl-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {xAxisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  )
}
