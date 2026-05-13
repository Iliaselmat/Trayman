import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'

// Fix default marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function numberIcon(n) {
  return L.divIcon({
    html: `<div style="background:#3b82f6;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);font-family:sans-serif">${n}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    className: '',
  })
}

const startIcon = L.divIcon({
  html: `<div style="background:#10b981;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">★</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: '',
})

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestNeighbor(clients, startLat, startLng) {
  const remaining = [...clients]
  const route = []
  let lat = startLat
  let lng = startLng
  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity
    remaining.forEach((c, i) => {
      const d = haversineKm(lat, lng, c.lat, c.lng)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    })
    route.push(remaining[bestIdx])
    lat = remaining[bestIdx].lat
    lng = remaining[bestIdx].lng
    remaining.splice(bestIdx, 1)
  }
  return route
}

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [48, 48] })
    else if (positions.length === 1) map.setView(positions[0], 14)
  }, [])
  return null
}

export default function RouteMap() {
  const { t } = useLang()
  const [route, setRoute] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [noGpsClients, setNoGpsClients] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await api.get('/clients')
      const withGps = data.filter(c => c.lat && c.lng)
      setNoGpsClients(data.length - withGps.length)

      if (withGps.length === 0) { setLoading(false); return }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude, longitude } = pos.coords
            setUserPos({ lat: latitude, lng: longitude })
            setRoute(nearestNeighbor(withGps, latitude, longitude))
            setLoading(false)
          },
          () => {
            setRoute(nearestNeighbor(withGps, withGps[0].lat, withGps[0].lng))
            setLoading(false)
          },
          { enableHighAccuracy: true, timeout: 6000 }
        )
      } else {
        setRoute(nearestNeighbor(withGps, withGps[0].lat, withGps[0].lng))
        setLoading(false)
      }
    }
    load()
  }, [])

  const allPositions = [
    ...(userPos ? [[userPos.lat, userPos.lng]] : []),
    ...route.map(c => [c.lat, c.lng]),
  ]

  const totalKm = route.reduce((sum, c, i) => {
    const prevLat = i === 0 ? (userPos?.lat ?? c.lat) : route[i - 1].lat
    const prevLng = i === 0 ? (userPos?.lng ?? c.lng) : route[i - 1].lng
    return sum + haversineKm(prevLat, prevLng, c.lat, c.lng)
  }, 0)

  const defaultCenter = allPositions[0] ?? [33.5731, -7.5898]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm animate-pulse">{t('loading')}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('routeMap')}</h2>
          {route.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {route.length} {t('clients').toLowerCase()} · ~{totalKm.toFixed(1)} km {t('total').toLowerCase()}
              {noGpsClients > 0 && (
                <span className="ml-2 text-amber-500">· {noGpsClients} {t('noLocation').toLowerCase()}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {route.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-gray-500 max-w-sm mx-auto text-sm">{t('noClientsWithGps')}</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Map */}
          <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden min-h-[400px] lg:min-h-0" style={{ height: 520 }}>
            <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <FitBounds positions={allPositions} />

              {allPositions.length > 1 && (
                <Polyline
                  positions={allPositions}
                  color="#3b82f6"
                  weight={3}
                  opacity={0.75}
                  dashArray="10 7"
                />
              )}

              {userPos && (
                <Marker position={[userPos.lat, userPos.lng]} icon={startIcon}>
                  <Popup>
                    <strong>{t('yourLocation')}</strong>
                  </Popup>
                </Marker>
              )}

              {route.map((client, idx) => (
                <Marker key={client.id} position={[client.lat, client.lng]} icon={numberIcon(idx + 1)}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <p style={{ fontWeight: 700, marginBottom: 2 }}>{idx + 1}. {client.name}</p>
                      <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>{client.address}</p>
                      {client.phone && <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 6 }}>{client.phone}</p>}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#3b82f6', fontSize: 12, textDecoration: 'underline' }}
                      >
                        {t('navigate')} →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Route sidebar */}
          <div className="w-full lg:w-72 bg-white rounded-xl shadow-sm flex flex-col" style={{ maxHeight: 520 }}>
            <div className="p-4 border-b shrink-0">
              <h3 className="text-sm font-semibold text-gray-700">{t('optimizedRoute')}</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {userPos && (
                <div className="flex items-center gap-3 px-2 py-2 mb-1 bg-emerald-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-base shrink-0">★</div>
                  <p className="text-xs font-medium text-emerald-700">{t('yourLocation')}</p>
                </div>
              )}
              {route.map((client, idx) => {
                const prevLat = idx === 0 ? (userPos?.lat ?? client.lat) : route[idx - 1].lat
                const prevLng = idx === 0 ? (userPos?.lng ?? client.lng) : route[idx - 1].lng
                const legKm = haversineKm(prevLat, prevLng, client.lat, client.lng)
                return (
                  <div key={client.id} className="flex items-start gap-3 px-2 py-2.5 border-b border-gray-50 hover:bg-gray-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{client.name}</p>
                      <p className="text-xs text-gray-400 truncate">{client.address}</p>
                      <p className="text-xs text-gray-400">+{legKm.toFixed(1)} km</p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-500 hover:underline shrink-0 pt-0.5"
                    >
                      Nav
                    </a>
                  </div>
                )
              })}
            </div>
            {route.length > 1 && (
              <div className="p-4 border-t shrink-0 flex justify-between text-sm text-gray-500">
                <span>{t('total')}</span>
                <span className="font-semibold text-gray-800">~{totalKm.toFixed(1)} km</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
