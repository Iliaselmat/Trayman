import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'

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

const TABS = ['warehouse', 'allocate', 'deliverers']

export default function AdminStock() {
  const { t } = useLang()
  const [tab, setTab] = useState('warehouse')
  const [warehouseStock, setWarehouseStock] = useState([])
  const [items, setItems] = useState([])
  const [deliverers, setDeliverers] = useState([])
  const [delivererStock, setDelivererStock] = useState([])

  // Add to warehouse modal
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ itemId: '', weight: '', quantity: '' })
  const [addError, setAddError] = useState('')

  // Adjust quantity modal (warehouse or deliverer)
  const [adjustModal, setAdjustModal] = useState(null) // { type: 'warehouse'|'deliverer', record, newQty, error }

  // Allocate form
  const [allocForm, setAllocForm] = useState({ delivererId: '', itemId: '', weight: '', quantity: '' })
  const [allocError, setAllocError] = useState('')
  const [allocSuccess, setAllocSuccess] = useState('')

  async function loadWarehouse() {
    const { data } = await api.get('/stock')
    setWarehouseStock(data)
  }

  async function loadAllDelivererStock() {
    const { data } = await api.get('/stock/allocations')
    setDelivererStock(data)
  }

  useEffect(() => {
    async function init() {
      const [w, it, u, ds] = await Promise.all([
        api.get('/stock'),
        api.get('/items'),
        api.get('/users'),
        api.get('/stock/allocations'),
      ])
      setWarehouseStock(w.data)
      setItems(it.data)
      setDeliverers(u.data.filter(u => u.role === 'deliverer'))
      setDelivererStock(ds.data)
    }
    init()
  }, [])

  function getWeightsForItem(itemId) {
    const item = items.find(i => i.id === itemId)
    if (!item) return []
    return item.weights.map(w => typeof w === 'object' ? w.weight : w)
  }

  function warehouseQty(itemId, weight) {
    return warehouseStock.find(s => s.itemId === itemId && s.weight === weight)?.quantity ?? 0
  }

  async function handleAddToWarehouse(e) {
    e.preventDefault()
    setAddError('')
    try {
      await api.post('/stock/add', {
        itemId: addForm.itemId,
        weight: addForm.weight,
        quantity: parseInt(addForm.quantity),
      })
      setAddModal(false)
      setAddForm({ itemId: '', weight: '', quantity: '' })
      loadWarehouse()
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error')
    }
  }

  async function handleAllocate(e) {
    e.preventDefault()
    setAllocError('')
    setAllocSuccess('')
    try {
      await api.post('/stock/allocate', {
        delivererId: allocForm.delivererId,
        itemId: allocForm.itemId,
        weight: allocForm.weight,
        quantity: parseInt(allocForm.quantity),
      })
      const delivererName = deliverers.find(d => d.id === allocForm.delivererId)?.name
      const itemName = items.find(i => i.id === allocForm.itemId)?.name
      setAllocSuccess(`✓ ${allocForm.quantity} × ${itemName} ${allocForm.weight} → ${delivererName}`)
      setAllocForm(f => ({ ...f, quantity: '' }))
      loadWarehouse()
      loadAllDelivererStock()
    } catch (err) {
      setAllocError(err.response?.data?.message || 'Error')
    }
  }

  async function handleAdjust(e) {
    e.preventDefault()
    setAdjustModal(m => ({ ...m, error: '' }))
    const qty = parseInt(adjustModal.newQty)
    if (isNaN(qty) || qty < 0) {
      setAdjustModal(m => ({ ...m, error: 'Enter a valid quantity (0 or more)' }))
      return
    }
    try {
      if (adjustModal.type === 'warehouse') {
        await api.patch('/stock/warehouse', {
          itemId: adjustModal.record.itemId,
          weight: adjustModal.record.weight,
          quantity: qty,
        })
        loadWarehouse()
      } else {
        await api.patch('/stock/deliverer-stock', {
          delivererId: adjustModal.record.delivererId,
          itemId: adjustModal.record.itemId,
          weight: adjustModal.record.weight,
          quantity: qty,
        })
        loadAllDelivererStock()
      }
      setAdjustModal(null)
    } catch (err) {
      setAdjustModal(m => ({ ...m, error: err.response?.data?.message || 'Error' }))
    }
  }

  const tabLabels = {
    warehouse: t('warehouseStock'),
    allocate: t('allocateStock'),
    deliverers: t('delivererStocks'),
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('stock')}</h2>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tabLabels[key]}
          </button>
        ))}
      </div>

      {/* ── Warehouse tab ── */}
      {tab === 'warehouse' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{warehouseStock.length} {t('items').toLowerCase()} {t('inStock') ?? 'in stock'}</p>
            <button
              onClick={() => { setAddModal(true); setAddForm({ itemId: '', weight: '', quantity: '' }); setAddError('') }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + {t('addToWarehouse')}
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[t('name'), t('weights'), t('currentStock'), t('actions')].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warehouseStock.map(s => (
                  <tr key={`${s.itemId}-${s.weight}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{s.itemName}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{s.weight}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${s.quantity === 0 ? 'text-red-500' : s.quantity < 10 ? 'text-amber-500' : 'text-gray-900'}`}>
                        {s.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-3">
                      <button
                        onClick={() => { setAddModal(true); setAddForm({ itemId: s.itemId, weight: s.weight, quantity: '' }); setAddError('') }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        + {t('restock')}
                      </button>
                      <button
                        onClick={() => setAdjustModal({ type: 'warehouse', record: s, newQty: String(s.quantity), error: '' })}
                        className="text-amber-600 hover:underline text-sm"
                      >
                        {t('edit')}
                      </button>
                    </td>
                  </tr>
                ))}
                {warehouseStock.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">{t('noStockYet')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Allocate tab ── */}
      {tab === 'allocate' && (
        <div className="max-w-md">
          <p className="text-sm text-gray-500 mb-4">{t('allocateStock')} — {t('currentStock').toLowerCase()} {t('available').toLowerCase()}</p>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <form onSubmit={handleAllocate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('deliverer')}</label>
                <select
                  value={allocForm.delivererId}
                  onChange={e => setAllocForm(f => ({ ...f, delivererId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('selectDeliverer')}</option>
                  {deliverers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('items')}</label>
                <select
                  value={allocForm.itemId}
                  onChange={e => setAllocForm(f => ({ ...f, itemId: e.target.value, weight: '' }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('selectItem')}</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('weights')}</label>
                <select
                  value={allocForm.weight}
                  onChange={e => setAllocForm(f => ({ ...f, weight: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!allocForm.itemId}
                >
                  <option value="">{!allocForm.itemId ? t('selectWeightFirst') : t('selectWeight')}</option>
                  {getWeightsForItem(allocForm.itemId).map(w => {
                    const qty = warehouseQty(allocForm.itemId, w)
                    return (
                      <option key={w} value={w}>{w} — {qty} {t('available')}</option>
                    )
                  })}
                </select>
                {allocForm.itemId && allocForm.weight && (
                  <p className="text-xs text-gray-400 mt-1">
                    {t('currentStock')}: <span className="font-medium text-gray-700">{warehouseQty(allocForm.itemId, allocForm.weight)}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockQty')}</label>
                <input
                  type="number"
                  min="1"
                  value={allocForm.quantity}
                  onChange={e => setAllocForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {allocError && <p className="text-red-500 text-sm">{allocError}</p>}
              {allocSuccess && <p className="text-green-600 text-sm">{allocSuccess}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium">
                {t('allocate')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Deliverer Stocks tab ── */}
      {tab === 'deliverers' && (
        <div className="space-y-6">
          {deliverers.length === 0 && (
            <p className="text-gray-400 text-sm">{t('noDeliverers')}</p>
          )}
          {deliverers.map(d => {
            const rows = delivererStock.filter(s => s.delivererId === d.id && s.quantity > 0)
            return (
              <div key={d.id} className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{d.name}</h3>
                  <span className="text-xs text-gray-400">{rows.length} {t('items').toLowerCase()}</span>
                </div>
                <table className="w-full min-w-[460px] text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {[t('name'), t('weights'), t('stockQty'), t('actions')].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map(s => (
                      <tr key={`${s.itemId}-${s.weight}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{s.itemName}</td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{s.weight}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{s.quantity}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setAdjustModal({ type: 'deliverer', record: { ...s, delivererId: d.id }, newQty: String(s.quantity), error: '' })}
                            className="text-amber-600 hover:underline text-sm"
                          >
                            {t('edit')}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-6 text-center text-gray-400 text-sm">{t('noStockForDeliverer')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* Add to Warehouse Modal */}
      {addModal && (
        <Modal title={t('addToWarehouse')} onClose={() => setAddModal(false)}>
          <form onSubmit={handleAddToWarehouse} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('items')}</label>
              <select
                value={addForm.itemId}
                onChange={e => setAddForm(f => ({ ...f, itemId: e.target.value, weight: '' }))}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('selectItem')}</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('weights')}</label>
              <select
                value={addForm.weight}
                onChange={e => setAddForm(f => ({ ...f, weight: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!addForm.itemId}
              >
                <option value="">{!addForm.itemId ? t('selectWeightFirst') : t('selectWeight')}</option>
                {getWeightsForItem(addForm.itemId).map(w => (
                  <option key={w} value={w}>{w} (currently: {warehouseQty(addForm.itemId, w)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockQty')} {t('add') ?? '(to add)'}</label>
              <input
                type="number"
                min="1"
                value={addForm.quantity}
                onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {addError && <p className="text-red-500 text-sm">{addError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium">
                {t('add')}
              </button>
              <button type="button" onClick={() => setAddModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                {t('cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adjust Quantity Modal */}
      {adjustModal && (
        <Modal
          title={`${t('edit')} — ${adjustModal.record.itemName} ${adjustModal.record.weight}`}
          onClose={() => setAdjustModal(null)}
        >
          <form onSubmit={handleAdjust} className="space-y-4">
            <p className="text-sm text-gray-500">
              {adjustModal.type === 'warehouse'
                ? t('currentStock')
                : deliverers.find(d => d.id === adjustModal.record.delivererId)?.name}
              {' · '}{t('currentStock')}: <span className="font-semibold text-gray-800">{adjustModal.record.quantity}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockQty')} (new exact value)</label>
              <input
                type="number"
                min="0"
                value={adjustModal.newQty}
                onChange={e => setAdjustModal(m => ({ ...m, newQty: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoFocus
              />
            </div>
            {adjustModal.error && <p className="text-red-500 text-sm">{adjustModal.error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-medium">
                {t('save')}
              </button>
              <button type="button" onClick={() => setAdjustModal(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                {t('cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
