// Helper component for inline editing
const EditableValue = ({ field, value, editing, setEditing, editValue, setEditValue, onApply, onLiveUpdate, color = "text-white" }) => {
    // Derived check for changes to avoid state sync issues
    const handleBlur = () => {
        let isDirty = false;
        if (typeof value === 'number') {
            const numVal = parseFloat(editValue);
            isDirty = !isNaN(numVal) && numVal !== value;
        } else {
            isDirty = editValue !== value;
        }
        onApply(isDirty);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
        if (e.key === 'Escape') setEditing(null);
    };

    if (editing === field) {
        return (
            <input
                type="text"
                value={editValue}
                onChange={(e) => {
                    const val = e.target.value;
                    setEditValue(val);
                    if (onLiveUpdate) onLiveUpdate(val);
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                autoFocus
                className="bg-slate-700 text-white px-1 py-0.5 rounded w-full text-center font-semibold"
                onClick={(e) => e.stopPropagation()}
            />
        );
    }
    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                setEditing(field);
                setEditValue(typeof value === 'number' ? value.toFixed(field === 'mass' ? 3 : 2) : value.toString());
            }}
            className={`${color} font-semibold cursor-pointer hover:bg-slate-700 px-1 py-0.5 rounded transition-colors`}
            title="Click to edit, Enter to apply"
        >
            {typeof value === 'number' ? value.toFixed(field === 'mass' ? 3 : 2) : value}
        </div>
    );
};

export default EditableValue;
