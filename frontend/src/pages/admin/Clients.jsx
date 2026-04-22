import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'
import { exportToExcel } from '../../utils/exportExcel'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function AdminClients() {
  const { t } = useLang()
  const [clients, setClients] = useState([])
  const [deliverers, setDeliverers] = useState([])
  const [assignModal, setAssignModal] = useState(null)
  const [selectedDeliverer, setSelectedDeliverer] = useState('')

  async function load() {
    const [c, u] = await Promise.all([api.get('/clients'), api.get('/users')])
    setClients(c.data)
    setDeliverers(u.data.filter(u => u.role === 'deliverer'))
  }
  useEffect(() => { load() }, [])

  function getDelivererName(id) {
    return deliverers.find(d => d.id === id)?.name || null
  }

  async function handleAssign() {
    await api.patch(`/clients/${assignModal.id}/assign`, { delivererId: selectedDeliverer || null })
    setAssignModal(null)
    load()
  }

  function handleExport() {
    const rows = clients.map(c => ({
      [t('name')]: c.name,
      [t('phone')]: c.phone,
      [t('address')]: c.address,
      [t('gpsLocation')]: c.lat ? `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : '',
      [t('assignedTo')]: c.assignedTo ? getDelivererName(c.assignedTo) : t('unassigned'),
    }))
    exportToExcel(rows, 'clients')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('clients')}</h2>
        <button onClick={handleExport} className="border border-gray-300 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium">
          ⬇ {t('exportExcel')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[t('name'), t('phone'), t('address'), t('gpsLocation'), t('assignedTo'), t('actions')].map(h => (
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
                <td className="px-6 py-4">
                  {c.assignedTo
                    ? <span className="text-gray-800">{getDelivererName(c.assignedTo)}</span>
                    : <span className="text-gray-400 italic">{t('unassigned')}</span>
                  }
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => { setAssignModal(c); setSelectedDeliverer(c.assignedTo || '') }}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {t('assign')}
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">{t('noClientsFound')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {assignModal && (
        <Modal title={`${t('assign')} "${assignModal.name}"`} onClose={() => setAssignModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectDeliverer')}</label>
              <select
                value={selectedDeliverer}
                onChange={e => setSelectedDeliverer(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('unassignOption')}</option>
                {deliverers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleAssign} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium">
                {t('confirm')}
              </button>
              <button onClick={() => setAssignModal(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                {t('cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
