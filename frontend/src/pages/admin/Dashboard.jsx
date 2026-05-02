import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'

function KpiCard({ label, value, sub, gradient, icon }) {
  return (
    <div className={`rounded-xl p-5 ${gradient} text-white shadow-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium opacity-80 truncate">{label}</p>
          <p className="text-2xl font-bold mt-1 truncate">{value}</p>
          {sub && <p className="text-xs opacity-70 mt-1 truncate">{sub}</p>}
        </div>
        <div className="text-3xl opacity-70 shrink-0">{icon}</div>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function StatusBar({ label, count, total, colorClass }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">
          {count} <span className="text-gray-400 font-normal text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-2 ${colorClass} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { t } = useLang()
  const [stats, setStats] = useState(null)
  const [finances, setFinances] = useState([])

  useEffect(() => {
    async function load() {
      const [users, items, clients, orders, fin] = await Promise.all([
        api.get('/users'),
        api.get('/items'),
        api.get('/clients'),
        api.get('/orders'),
        api.get('/finances'),
      ])
      const orderList = orders.data
      setStats({
        users: users.data.length,
        deliverers: users.data.filter(u => u.role === 'deliverer').length,
        items: items.data.length,
        clients: clients.data.length,
        total: orderList.length,
        processing: orderList.filter(o => o.status === 'processing').length,
        delivered: orderList.filter(o => o.status === 'delivered').length,
        cancelled: orderList.filter(o => o.status === 'cancelled').length,
        revenue: orderList.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0),
        pending: orderList.filter(o => o.status === 'processing').reduce((s, o) => s + (o.total || 0), 0),
      })
      setFinances(fin.data)
    }
    load()
  }, [])

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-400 text-sm animate-pulse">{t('loading')}</div>
      </div>
    )
  }

  const totalOutstanding = finances.reduce((s, d) => s + Math.max(0, d.balance), 0)
  const totalPaid = finances.reduce((s, d) => s + d.paidTotal, 0)
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{today}</p>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t('totalRevenue')}
          value={`${stats.revenue.toFixed(0)} MAD`}
          sub={`${stats.delivered} ${t('delivered').toLowerCase()}`}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          icon="💰"
        />
        <KpiCard
          label={t('pendingCollection')}
          value={`${stats.pending.toFixed(0)} MAD`}
          sub={`${stats.processing} ${t('processing').toLowerCase()}`}
          gradient="bg-gradient-to-br from-amber-400 to-amber-600"
          icon="🕐"
        />
        <KpiCard
          label={t('paidToAdmin')}
          value={`${totalPaid.toFixed(0)} MAD`}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
          icon="✅"
        />
        <KpiCard
          label={t('balanceDue')}
          value={`${totalOutstanding.toFixed(0)} MAD`}
          sub={totalOutstanding === 0 ? t('allPaidUp') : `${finances.filter(d => d.balance > 0).length} ${t('deliverers').toLowerCase()}`}
          gradient={totalOutstanding > 0 ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}
          icon={totalOutstanding > 0 ? '⚠️' : '🎉'}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 mb-4">{t('ordersBreakdown')}</h3>
          {stats.total === 0
            ? <p className="text-sm text-gray-400 italic">{t('noOrdersFound')}</p>
            : (
              <div className="space-y-4">
                <StatusBar label={t('processing')} count={stats.processing} total={stats.total} colorClass="bg-amber-400" />
                <StatusBar label={t('delivered')} count={stats.delivered} total={stats.total} colorClass="bg-emerald-500" />
                <StatusBar label={t('cancelled')} count={stats.cancelled} total={stats.total} colorClass="bg-red-400" />
                <p className="text-xs text-gray-400 pt-1">{stats.total} {t('orders').toLowerCase()} {t('total').toLowerCase()}</p>
              </div>
            )
          }
        </div>

        {/* Deliverer balances */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">{t('delivererBalances')}</h3>
            <Link to="/admin/finances" className="text-xs text-blue-600 hover:underline">{t('details')} →</Link>
          </div>
          {finances.length === 0
            ? <p className="text-sm text-gray-400 italic">{t('noDeliverers')}</p>
            : (
              <div className="space-y-4">
                {finances.map(d => {
                  const paidPct = d.deliveredTotal > 0
                    ? Math.min(100, Math.round((d.paidTotal / d.deliveredTotal) * 100))
                    : 100
                  return (
                    <div key={d.delivererId}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-gray-700">{d.delivererName}</span>
                        <span className={`text-sm font-semibold ${d.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {d.balance > 0 ? `−${d.balance.toFixed(0)} MAD` : '✓'}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${d.balance > 0 ? 'bg-red-400' : 'bg-emerald-400'}`}
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {d.paidTotal.toFixed(0)} {t('ofTotal')} {d.deliveredTotal.toFixed(0)} MAD {t('paidToAdmin').toLowerCase()}
                      </p>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Quick stats bottom row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t('users')} value={stats.users} />
        <StatCard label={t('deliverers')} value={stats.deliverers} />
        <StatCard label={t('items')} value={stats.items} />
        <StatCard label={t('clients')} value={stats.clients} />
      </div>
    </div>
  )
}
