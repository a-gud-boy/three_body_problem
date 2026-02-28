import { useState, memo } from 'react';
import { X, AlertTriangle } from 'lucide-react';

/**
 * CapabilityBanner – detects WebGPU / WebGL support and shows a
 * dismissable warning if WebGPU is unavailable, or an error
 * if neither rendering API is supported.
 */
export default memo(function CapabilityBanner() {
    const [status] = useState(() => {
        if (typeof window === 'undefined') return null;

        const hasWebGL = (() => {
            try {
                const c = document.createElement('canvas');
                return !!(c.getContext('webgl') || c.getContext('webgl2'));
            } catch {
                return false;
            }
        })();

        const hasWebGPU = !!navigator.gpu;

        if (!hasWebGL && !hasWebGPU) return 'no-graphics';
        if (!hasWebGPU) return 'no-webgpu';
        return null;
    });
    const [dismissed, setDismissed] = useState(false);

    if (!status || dismissed) return null;

    const isError = status === 'no-graphics';

    return (
        <div style={{
            position: 'fixed',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.75rem',
            border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
            background: isError ? 'rgba(127, 29, 29, 0.9)' : 'rgba(113, 63, 18, 0.9)',
            backdropFilter: 'blur(8px)',
            color: isError ? '#fecaca' : '#fef08a',
            fontSize: '0.875rem',
            maxWidth: '600px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>
                {isError
                    ? 'Your browser does not support WebGL or WebGPU. Simulations will not render correctly.'
                    : 'WebGPU is not available in your browser. The WebGPU renderer option in the General Relativity simulation will not work. WebGL mode will be used instead.'}
            </span>
            {!isError && (
                <button
                    onClick={() => setDismissed(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        flexShrink: 0,
                    }}
                    aria-label="Dismiss"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
});
