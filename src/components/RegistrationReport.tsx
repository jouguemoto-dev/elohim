import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { Registration, ChurchEvent } from '../types';
import { format, parseISO, startOfDay, eachDayOfInterval, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RegistrationReportProps {
  registrations: Registration[];
  events: ChurchEvent[];
}

const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function RegistrationReport({ registrations, events }: RegistrationReportProps) {
  // 1. Status Distribution
  const statusData = useMemo(() => {
    const paid = registrations.filter(r => r.status === 'paid').length;
    const pending = registrations.filter(r => r.status === 'pending').length;
    return [
      { name: 'Pagos', value: paid },
      { name: 'Pendentes', value: pending }
    ];
  }, [registrations]);

  // 2. Minor vs Adult Distribution
  const ageData = useMemo(() => {
    const minor = registrations.filter(r => r.isMinor).length;
    const adult = registrations.filter(r => !r.isMinor).length;
    return [
      { name: 'Menores', value: minor },
      { name: 'Adultos', value: adult }
    ];
  }, [registrations]);

  // 3. Registrations by Event
  const eventData = useMemo(() => {
    return events.map(event => {
      const regs = registrations.filter(r => r.eventId === event.id);
      return {
        name: event.title.length > 15 ? event.title.substring(0, 12) + '...' : event.title,
        inscritos: regs.length,
        arrecadado: regs.reduce((sum, r) => sum + (r.amountPaid || 0), 0)
      };
    }).filter(e => e.inscritos > 0);
  }, [registrations, events]);

  // 4. Registration Trend (Last 15 days)
  const trendData = useMemo(() => {
    const end = startOfDay(new Date());
    const start = subDays(end, 14);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const count = registrations.filter(r => {
        if (!r.registeredAt) return false;
        return isSameDay(parseISO(r.registeredAt), day);
      }).length;
      return {
        date: format(day, 'dd/MM'),
        count
      };
    });
  }, [registrations]);

  // 5. Finance by Event (Collected vs Expected)
  const financialData = useMemo(() => {
    return events.map(event => {
      const regs = registrations.filter(r => r.eventId === event.id);
      const collected = regs.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
      const expected = regs.length * (event.price || 0);
      return {
        name: event.title.length > 15 ? event.title.substring(0, 12) + '...' : event.title,
        pago: collected,
        pendente: Math.max(0, expected - collected)
      };
    }).filter(e => e.pago > 0 || e.pendente > 0);
  }, [registrations, events]);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-black">
      {/* Overview Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status & Age Pie Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950/50 p-8 rounded-[2.5rem] border border-zinc-900">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] text-center">Status de Pagamento</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4">
              {statusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: index === 0 ? '#10b981' : '#f43f5e' }} />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] text-center">Perfil Etário</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index + 2 % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4">
              {ageData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index + 2 % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend Area Chart */}
        <div className="bg-zinc-950/50 p-8 rounded-[2.5rem] border border-zinc-900 flex flex-col">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6">Tendência de Inscrições (Últimos 15 dias)</h3>
          <div className="flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px', fontSize: '10px' }}
                    cursor={{ stroke: '#27272a', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="count" name="Inscrições" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Events Bar Chart */}
        <div className="bg-zinc-950/50 p-8 rounded-[2.5rem] border border-zinc-900">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6">Inscrições por Evento</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
                <XAxis type="number" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px', fontSize: '10px' }}
                />
                <Bar dataKey="inscritos" name="Total Inscritos" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Bar Chart */}
        <div className="bg-zinc-950/50 p-8 rounded-[2.5rem] border border-zinc-900">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6">Visão Financeira por Evento</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px', fontSize: '10px' }}
                  formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                <Bar dataKey="pago" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendente" name="Pendente" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
