import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'
import { exportToExcel } from '../../utils/exportExcel'

const STATUS_COLORS = {
  processing: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export default function DelivererOrders() {
  const { t } = useLang()
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({ clientId: '', orderItems: [{ itemId: '', quantity: 1, weight: '' }] })
  const [error, setError] = useState('')

  async function load() {
    const [o, c, i] = await Promise.all([api.get('/orders'), api.get('/clients'), api.get('/items')])
    setOrders(o.data)
    setClients(c.data)
    setItems(i.data)
  }
  useEffect(() => { load() }, [])

  function addOrderItem() {
    setForm(f => ({ ...f, orderItems: [...f.orderItems, { itemId: '', quantity: 1, weight: '' }] }))
  }

  function removeOrderItem(idx) {
    setForm(f => ({ ...f, orderItems: f.orderItems.filter((_, i) => i !== idx) }))
  }

  function updateOrderItem(idx, field, value) {
    setForm(f => {
      const oi = [...f.orderItems]
      oi[idx] = { ...oi[idx], [field]: value }
      if (field === 'itemId') oi[idx].weight = ''
      return { ...f, orderItems: oi }
    })
  }

  function getWeightsForItem(itemId) {
    return items.find(i => i.id === itemId)?.weights || []
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/orders', {
        clientId: form.clientId,
        items: form.orderItems.map(oi => ({ itemId: oi.itemId, quantity: parseInt(oi.quantity), weight: oi.weight }))
      })
      setModal(null)
      setForm({ clientId: '', orderItems: [{ itemId: '', quantity: 1, weight: '' }] })
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error')
    }
  }

  async function updateStatus(orderId, status) {
    await api.patch(`/orders/${orderId}/status`, { status })
    load()
  }

  function handleExport() {
    const rows = orders.map(o => ({
      [t('client')]: o.clientName,
      [t('status')]: t(o.status),
      [t('date')]: new Date(o.createdAt).toLocaleDateString(),
    }))
    exportToExcel(rows, 'my-orders')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('myOrders')}</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="border border-gray-300 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium">
            ⬇ {t('exportExcel')}
          </button>
          <button
            onClick={() => { setModal('new'); setError('') }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + {t('newOrder')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[t('client'), t('status'), t('date'), t('actions')].map(h => (
                <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{o.clientName}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>{t(o.status)}</span>
                </td>
                <td className="px-6 py-4 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={() => setDetail(o)} className="text-blue-600 hover:underline text-sm">{t('view')}</button>
                    {o.status === 'processing' && (
                      <>
                        <button onClick={() => updateStatus(o.id, 'delivered')} className="text-green-600 hover:underline text-sm">{t('markDelivered')}</button>
                        <button onClick={() => updateStatus(o.id, 'cancelled')} className="text-red-500 hover:underline text-sm">{t('markCancelled')}</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">{t('noOrdersYet')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === 'new' && (
        <Modal title={t('newOrder')} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('client')}</label>
              <select
                value={form.clientId}
                onChange={e => setForm({ ...form, clientId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">{t('selectClient')}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">{t('items')}</label>
                <button type="button" onClick={addOrderItem} className="text-green-600 text-sm hover:underline">{t('addItemRow')}</button>
              </div>
              <div className="space-y-3">
                {form.orderItems.map((oi, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="flex gap-2">
                      <select
                        value={oi.itemId}
                        onChange={e => updateOrderItem(idx, 'itemId', e.target.value)}
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        required
                      >
                        <option value="">{t('selectItem')}</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      {form.orderItems.length > 1 && (
                        <button type="button" onClick={() => removeOrderItem(idx)} className="text-red-400 hover:text-red-600 px-2 text-lg leading-none">&times;</button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={oi.weight}
                        onChange={e => updateOrderItem(idx, 'weight', e.target.value)}
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        required
                        disabled={!oi.itemId}
                      >
                        <option value="">{t('selectWeight')}</option>
                        {getWeightsForItem(oi.itemId).map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={oi.quantity}
                        onChange={e => updateOrderItem(idx, 'quantity', e.target.value)}
                        className="w-20 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder={t('qty')}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium">
                {t('createOrder')}
              </button>
              <button type="button" onClick={() => setModal(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                {t('cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={t('orderDetails')} onClose={() => setDetail(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-gray-500">{t('client')}</p><p className="font-medium">{detail.clientName}</p></div>
              <div><p className="text-gray-500">{t('date')}</p><p className="font-medium">{new Date(detail.createdAt).toLocaleDateString()}</p></div>
              <div>
                <p className="text-gray-500">{t('status')}</p>
                <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[detail.status]}`}>
                  {t(detail.status)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-gray-500 mb-2">{t('items')}</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">{t('name')}</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">{t('weights')}</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">{t('qty')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">{item.itemName}</td>
                        <td className="px-4 py-2">{item.weight}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
