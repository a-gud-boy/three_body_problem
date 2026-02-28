import React from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={styles.container}>
                    <div style={styles.card}>
                        <div style={styles.icon}>⚠️</div>
                        <h1 style={styles.title}>Something went wrong</h1>
                        <p style={styles.message}>
                            {this.state.error?.message || 'An unexpected error occurred in this simulation.'}
                        </p>
                        {this.state.errorInfo && (
                            <details style={styles.details}>
                                <summary style={styles.summary}>Error Details</summary>
                                <pre style={styles.stack}>
                                    {this.state.error?.stack}
                                </pre>
                            </details>
                        )}
                        <div style={styles.actions}>
                            <button onClick={this.handleRetry} style={styles.retryBtn}>
                                Try Again
                            </button>
                            <Link to="/" style={styles.homeLink}>
                                Return Home
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a1a',
        padding: '2rem',
    },
    card: {
        background: 'rgba(30, 30, 50, 0.9)',
        border: '1px solid rgba(100, 100, 150, 0.3)',
        borderRadius: '1rem',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        backdropFilter: 'blur(12px)',
    },
    icon: {
        fontSize: '3rem',
        marginBottom: '1rem',
    },
    title: {
        color: '#e2e8f0',
        fontSize: '1.5rem',
        fontWeight: '700',
        marginBottom: '0.75rem',
    },
    message: {
        color: '#94a3b8',
        fontSize: '0.95rem',
        lineHeight: '1.6',
        marginBottom: '1.5rem',
    },
    details: {
        textAlign: 'left',
        marginBottom: '1.5rem',
    },
    summary: {
        color: '#64748b',
        cursor: 'pointer',
        fontSize: '0.85rem',
        marginBottom: '0.5rem',
    },
    stack: {
        color: '#ef4444',
        fontSize: '0.75rem',
        background: 'rgba(0, 0, 0, 0.4)',
        padding: '1rem',
        borderRadius: '0.5rem',
        overflow: 'auto',
        maxHeight: '200px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    actions: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
    },
    retryBtn: {
        padding: '0.6rem 1.5rem',
        background: '#3b82f6',
        color: '#fff',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '600',
        transition: 'background 0.2s',
    },
    homeLink: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.6rem 1.5rem',
        background: 'rgba(100, 100, 150, 0.2)',
        color: '#94a3b8',
        border: '1px solid rgba(100, 100, 150, 0.3)',
        borderRadius: '0.5rem',
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontWeight: '600',
        transition: 'background 0.2s',
    },
};

export default ErrorBoundary;
