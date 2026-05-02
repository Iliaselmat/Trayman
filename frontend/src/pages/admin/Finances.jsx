import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'
import { exportToExcel } from '../../utils/exportExcel'

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export default function AdminFinances() {
  const { t } = useLang()
  const [data, setData] = useState([])
  const [detail, setDetail] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', note: '' })
  const [error, setError] = useState('')

  async function load() {
    const { data: res } = await api.get('/finances')
    setData(res)
    return res
  }
  useEffect(() => { load() }, [])

  function handleExport() {
    const rows = data.map(d => ({
      [t('deliverer')]: d.delivererName,
      [t('collectedFromClients')] : `${d.deliveredTotal.toFixed(2)} MAD`,
      [t('pendingCollection')]: `${d.pendingTotal.toFixed(2)} MAD`,
      [t('paidToAdmin')]: `${d.paidTotal.toFixed(2)} MAD`,
      [t('balanceDue')]: `${d.balance.toFixed(2)} MAD`,
    }))
    exportToExcel(rows, 'finances')
  }

  async function handleRecordPayment(e) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/payments', {
        delivererId: payModal.delivererId,
        amount: parseFloat(payForm.amount),
        note: payForm.note,
      })
      setPayModal(null)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error')
    }
  }

  async function handleDeletePayment(paymentId) {
    if (!confirm(t('deletePaymentConfirm'))) return
    await api.delete(`/payments/${paymentId}`)
    const res = await load()
    if (detail && res) {
      const updated = res.find(d => d.delivererId === detail.delivererId)
      setDetail(updated || null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('finances')}</h2>
        <button
          onClick={handleExport}
          className="border border-gray-300 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium"
        >
          ⬇ {t('exportExcel')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[t('deliverer'), t('collectedFromClients'), t('pendingCollection'), t('paidToAdmin'), t('balanceDue'), t('actions')].map(h => (
                <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(d => (
              <tr key={d.delivererId} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{d.delivererName}</td>
                <td className="px-6 py-4 text-gray-700">{d.deliveredTotal.toFixed(2)} MAD</td>
                <td className="px-6 py-4 text-yellow-600">{d.pendingTotal.toFixed(2)} MAD</td>
                <td className="px-6 py-4 text-green-600">{d.paidTotal.toFixed(2)} MAD</td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${d.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {d.balance.toFixed(2)} MAD
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => setDetail(d)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {t('details')}
                    </button>
                    <button
                      onClick={() => { setPayModal(d); setPayForm({ amount: '', note: '' }); setError('') }}
                      className="text-green-600 hover:underline text-sm"
                    >
                      {t('recordPayment')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">{t('noDeliverers')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {detail && (
        <Modal title={`${detail.delivererName} — ${t('details')}`} onClose={() => setDetail(null)} wide>
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{t('collectedFromClients')}</p>
                <p className="font-semibold text-gray-900">{detail.deliveredTotal.toFixed(2)} MAD</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{t('paidToAdmin')}</p>
                <p className="font-semibold text-green-700">{detail.paidTotal.toFixed(2)} MAD</p>
              </div>
              <div className={`rounded-lg p-3 ${detail.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-xs text-gray-500 mb-1">{t('balanceDue')}</p>
                <p className={`font-semibold ${detail.balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {detail.balance.toFixed(2)} MAD
                </p>
              </div>
            </div>

            {/* Delivered orders */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('deliveredOrdersList')}</h4>
              {detail.deliveredOrders.length === 0
                ? <p className="text-sm text-gray-400 italic">{t('noDeliveredOrders')}</p>
                : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">{t('client')}</th>
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">{t('date')}</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">{t('amount')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.deliveredOrders.map(o => (
                          <tr key={o.id}>
                            <td className="px-4 py-2 font-medium">{o.clientName}</td>
                            <td className="px-4 py-2 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-right font-mono">{o.total.toFixed(2)} MAD</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-4 py-2" colSpan={2}>{t('total')}</td>
                          <td className="px-4 py-2 text-right font-mono">{detail.deliveredTotal.toFixed(2)} MAD</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>

            {/* Payment history */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('paymentHistory')}</h4>
              {detail.payments.length === 0
                ? <p className="text-sm text-gray-400 italic">{t('noPaymentsYet')}</p>
                : (
                  <div className="space-y-2">
                    {detail.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                        <div>
                          <span className="font-semibold text-green-700 text-sm">{p.amount.toFixed(2)} MAD</span>
                          {p.note && <span className="text-gray-500 text-xs ml-2">— {p.note}</span>}
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          className="text-red-400 hover:text-red-600 text-xs ml-4 shrink-0"
                        >
                          {t('delete')}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

            <div className="pt-2 border-t">
              <button
                onClick={() => { setPayModal(detail); setPayForm({ amount: '', note: '' }); setError(''); setDetail(null) }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium text-sm"
              >
                {t('recordPayment')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {payModal && (
        <Modal title={`${t('recordPayment')}: ${payModal.delivererName}`} onClose={() => setPayModal(null)}>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 flex justify-between">
              <span>{t('balanceDue')}</span>
              <span className={`font-semibold ${payModal.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {payModal.balance.toFixed(2)} MAD
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('amount')} (MAD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={payModal.balance > 0 ? payModal.balance.toFixed(2) : '0.00'}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('noteOptional')}</label>
              <input
                value={payForm.note}
                onChange={e => setPayForm({ ...payForm, note: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium">
                {t('confirm')}
              </button>
              <button type="button" onClick={() => setPayModal(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                {t('cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
