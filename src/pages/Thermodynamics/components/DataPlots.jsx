import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

export default React.memo(function DataPlots({ speedDistribution, history }) {
    return (
        <>
            {/* PV Diagram */}
            <div className="plot-container">
                <h4 className="plot-title">PV Diagram (Pressure vs Volume)</h4>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis
                                dataKey="volume"
                                type="number"
                                domain={[20, 100]}
                                stroke="#94a3b8"
                                fontSize={10}
                                tickFormatter={(val) => `${val}%`}
                                label={{ value: 'Volume', position: 'insideBottomRight', offset: -5, fill: '#94a3b8', fontSize: 10 }}
                            />
                            <YAxis
                                dataKey="pressure"
                                stroke="#94a3b8"
                                fontSize={10}
                                domain={[0, 'auto']}
                                width={30}
                            />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', fontSize: '12px' }}
                                itemStyle={{ color: '#38bdf8' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="pressure"
                                stroke="#38bdf8"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Speed Distribution */}
            <div className="plot-container">
                <h4 className="plot-title">Maxwell-Boltzmann Distribution</h4>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={speedDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis
                                dataKey="speed"
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                tick={false}
                                label={{ value: 'Particle Speed', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={10}
                                width={30}
                            />
                            <Bar dataKey="count" fill="#fb923c" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                                {speedDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.speed > 500 ? '#ef4444' : (entry.speed < 200 ? '#3b82f6' : '#fb923c')} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
});
