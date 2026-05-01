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

export default function AdminOrders() {
  const { t } = useLang()
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [deliverers, setDeliverers] = useState([])
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState({ status: '', startDate: '', endDate: '' })
  const [detail, setDetail] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ delivererId: '', clientId: '', orderItems: [{ itemId: '', quantity: 1, weight: '' }] })
  const [error, setError] = useState('')

  async function load() {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    const { data } = await api.get('/orders', { params })
    setOrders(data)
  }

  async function loadFormData() {
    const [c, u, i] = await Promise.all([api.get('/clients'), api.get('/users'), api.get('/items')])
    setClients(c.data)
    setDeliverers(u.data.filter(u => u.role === 'deliverer'))
    setItems(i.data)
  }

  useEffect(() => { load() }, [filters])
  useEffect(() => { loadFormData() }, [])

  function openModal() {
    setForm({ delivererId: '', clientId: '', orderItems: [{ itemId: '', quantity: 1, weight: '' }] })
    setError('')
    setModal(true)
  }

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
    if (!form.delivererId) { setError(t('selectDeliverer')); return }
    try {
      await api.post('/orders', {
        clientId: form.clientId,
        delivererId: form.delivererId,
        items: form.orderItems.map(oi => ({ itemId: oi.itemId, quantity: parseInt(oi.quantity), weight: oi.weight }))
      })
      setModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error')
    }
  }

  function handleExport() {
    const rows = orders.map(o => ({
      [t('orderId')]: o.id.slice(0, 8),
      [t('client')]: o.clientName,
      [t('deliverer')]: o.delivererName,
      [t('status')]: t(o.status),
      [t('date')]: new Date(o.createdAt).toLocaleDateString(),
    }))
    exportToExcel(rows, 'orders')
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('orders')}</h2>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-4 items-center">
        <select
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('allStatuses')}</option>
          <option value="processing">{t('processing')}</option>
          <option value="delivered">{t('delivered')}</option>
          <option value="cancelled">{t('cancelled')}</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('from')}
          <input type="date" value={filters.startDate}
            onChange={e => setFilters({ ...filters, startDate: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('to')}
          <input type="date" value={filters.endDate}
            onChange={e => setFilters({ ...filters, endDate: e.target.value })}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
        <button onClick={() => setFilters({ status: '', startDate: '', endDate: '' })}
          className="text-sm text-gray-400 hover:text-gray-600 underline">
          {t('clear')}
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={handleExport} className="border border-gray-300 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium">
            ⬇ {t('exportExcel')}
          </button>
          <button onClick={openModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + {t('addOrder')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[t('orderId'), t('client'), t('deliverer'), t('status'), t('date'), t('actions')].map(h => (
                <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-xs text-gray-400">{o.id.slice(0, 8)}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{o.clientName}</td>
                <td className="px-6 py-4 text-gray-600">{o.delivererName}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                    {t(o.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <button onClick={() => setDetail(o)} className="text-blue-600 hover:underline text-sm">{t('view')}</button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">{t('noOrdersFound')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Order Modal */}
      {modal && (
        <Modal title={t('addOrder')} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('deliverer')}</label>
              <select
                value={form.delivererId}
                onChange={e => setForm({ ...form, delivererId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('selectDeliverer')}</option>
                {deliverers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('client')}</label>
              <select
                value={form.clientId}
                onChange={e => setForm({ ...form, clientId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('selectClient')}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">{t('items')}</label>
                <button type="button" onClick={addOrderItem} className="text-blue-600 text-sm hover:underline">{t('addItemRow')}</button>
              </div>
              <div className="space-y-3">
                {form.orderItems.map((oi, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="flex gap-2">
                      <select
                        value={oi.itemId}
                        onChange={e => updateOrderItem(idx, 'itemId', e.target.value)}
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        className="w-20 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium">
                {t('createOrder')}
              </button>
              <button type="button" onClick={() => setModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                {t('cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal title={t('orderDetails')} onClose={() => setDetail(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-gray-500">{t('client')}</p><p className="font-medium">{detail.clientName}</p></div>
              <div><p className="text-gray-500">{t('deliverer')}</p><p className="font-medium">{detail.delivererName}</p></div>
              <div>
                <p className="text-gray-500">{t('status')}</p>
                <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[detail.status]}`}>
                  {t(detail.status)}
                </span>
              </div>
              <div><p className="text-gray-500">{t('date')}</p><p className="font-medium">{new Date(detail.createdAt).toLocaleDateString()}</p></div>
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
