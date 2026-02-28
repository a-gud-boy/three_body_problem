import React from 'react';

export default React.memo(function PistonControl({ value, onChange }) {
    return (
        <div className="control-group">
            <div className="control-item">
                <label className="control-label">Volume (Piston)</label>
                <div className="text-xs font-mono text-cyan-400">
                    {Math.round(value)}%
                </div>
            </div>
            <input
                type="range"
                min="20"
                max="100"
                step="0.1"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>COMPRESSED</span>
                <span>EXPANDED</span>
            </div>
        </div>
    );
});
