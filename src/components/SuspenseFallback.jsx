const fallbackStyle = {
    display: 'flex',
    height: '100vh',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    color: '#fff',
};

export default function SuspenseFallback() {
    return (
        <div style={fallbackStyle}>
            <p>Loading Simulation...</p>
        </div>
    );
}
