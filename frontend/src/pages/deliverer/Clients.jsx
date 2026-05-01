import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'
import { exportToExcel } from '../../utils/exportExcel'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// gpsStatus: 'idle' | 'loading' | 'done' | 'denied' | 'error'
function GpsField({ gpsStatus, lat, lng, onRequest, t }) {
  if (gpsStatus === 'idle') {
    return (
      <button
        type="button"
        onClick={onRequest}
        className="w-full border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 text-green-700 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        <span>📍</span> {t('getLocation')}
      </button>
    )
  }

  if (gpsStatus === 'loading') {
    return (
      <div className="w-full border border-blue-200 bg-blue-50 rounded-lg py-3 text-center text-blue-600 text-sm">
        <span className="animate-pulse">📡 {t('gettingLocation')}</span>
      </div>
    )
  }

  if (gpsStatus === 'done') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-700 font-medium text-sm">✅ {t('locationCollected')}</p>
            <p className="text-green-600 text-xs font-mono mt-0.5">
              {lat?.toFixed(6)}, {lng?.toFixed(6)}
            </p>
          </div>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            {t('viewOnMap')}
          </a>
        </div>
        <button type="button" onClick={onRequest} className="text-xs text-green-600 hover:underline mt-2">
          ↻ {t('retryLocation')}
        </button>
      </div>
    )
  }

  if (gpsStatus === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
        <p className="text-red-700 text-sm">🚫 {t('locationDenied')}</p>
        <button type="button" onClick={onRequest} className="text-xs text-red-600 hover:underline font-medium">
          ↻ {t('retryLocation')}
        </button>
      </div>
    )
  }

  if (gpsStatus === 'error') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
        <p className="text-yellow-700 text-sm">⚠️ {t('locationError')}</p>
        <button type="button" onClick={onRequest} className="text-xs text-yellow-600 hover:underline font-medium">
          ↻ {t('retryLocation')}
        </button>
      </div>
    )
  }

  return null
}

export default function DelivererClients() {
  const { t } = useLang()
  const [clients, setClients] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', lat: null, lng: null })
  const [gpsStatus, setGpsStatus] = useState('idle')
  const [error, setError] = useState('')

  async function load() {
    const { data } = await api.get('/clients')
    setClients(data)
  }
  useEffect(() => { load() }, [])

  function openModal() {
    setForm({ name: '', phone: '', address: '', lat: null, lng: null })
    setGpsStatus('idle')
    setError('')
    setModal(true)
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('error')
      return
    }
    setGpsStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }))
        setGpsStatus('done')
      },
      err => {
        setGpsStatus(err.code === 1 ? 'denied' : 'error')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.lat || !form.lng) {
      setError(t('locationRequired'))
      return
    }
    try {
      await api.post('/clients', form)
      setModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error')
    }
  }

  function handleExport() {
    const rows = clients.map(c => ({
      [t('name')]: c.name,
      [t('phone')]: c.phone,
      [t('address')]: c.address,
      'GPS': c.lat ? `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : '',
      [t('added')]: new Date(c.createdAt).toLocaleDateString(),
    }))
    exportToExcel(rows, 'my-clients')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('myClients')}</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="border border-gray-300 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium">
            ⬇ {t('exportExcel')}
          </button>
          <button onClick={openModal} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + {t('addClient')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[t('name'), t('phone'), t('address'), t('gpsLocation'), t('added')].map(h => (
                <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                <td className="px-6 py-4 text-gray-600">{c.phone}</td>
                <td className="px-6 py-4 text-gray-600">{c.address}</td>
                <td className="px-6 py-4">
                  {c.lat
                    ? (
                      <a
                        href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        📍 {t('viewOnMap')}
                      </a>
                    )
                    : <span className="text-gray-400 text-xs italic">{t('noLocation')}</span>
                  }
                </td>
                <td className="px-6 py-4 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">{t('noClientsYet')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={t('addClient')} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('phoneNumber')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('address')}</label>
              <input
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📍 {t('gpsLocation')} <span className="text-red-500 text-xs font-normal ml-1">({t('locationRequired').split(' ').slice(-2).join(' ')})</span>
              </label>
              <GpsField
                gpsStatus={gpsStatus}
                lat={form.lat}
                lng={form.lng}
                onRequest={requestLocation}
                t={t}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium"
              >
                {t('add')}
              </button>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
