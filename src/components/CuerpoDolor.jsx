import Body from 'react-muscle-highlighter'
import { colorDolor } from '../lib/sensaciones'

// Dibujo anatómico de frente y de espaldas (react-muscle-highlighter, licencia MIT).
// zonas: [{ zona, lado, intensidad }] se colorean según la intensidad. onPulsar(zona, lado) al tocar.
export default function CuerpoDolor({ genero = 'female', zonas = [], onPulsar, escala = 1 }) {
  const datos = zonas.map(z => ({ slug: z.zona, side: z.lado ?? undefined, color: colorDolor(z.intensidad) }))
  const pulsar = onPulsar && ((parte, lado) => { if (parte.slug && parte.slug !== 'hair') onPulsar(parte.slug, lado ?? null) })
  return (
    <div className="cuerpo flex items-start justify-center gap-2">
      {['front', 'back'].map(lado => (
        <div key={lado} className="min-w-0 text-center">
          <Body side={lado} gender={genero} data={datos} scale={escala} onBodyPartPress={pulsar}
            defaultFill="#eef2f6" defaultStroke="#cbd5e1" defaultStrokeWidth={0.5} border="none" hiddenParts={['hair']} />
          <p className="-mt-1 text-xs text-slate-500">{lado === 'front' ? 'Frente' : 'Espalda'}</p>
        </div>
      ))}
    </div>
  )
}

export function LeyendaDolor() {
  return (
    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
      <span>Leve</span>{[1, 3, 5, 7, 9].map(n => <span key={n} className="h-2.5 w-6 rounded" style={{ background: colorDolor(n) }} />)}<span>Intenso</span>
    </div>
  )
}
