import { useState } from 'react';
import '../../styles/App.css';

const COLOR_PALETTE = [
    { color: '#ffffff', label: 'White' },
    { color: '#eff6ff', label: 'Blue' }, // Blue-50
    { color: '#f0fdf4', label: 'Green' }, // Green-50
    { color: '#fef2f2', label: 'Red' }, // Red-50
    { color: '#fefce8', label: 'Yellow' }, // Yellow-50
    { color: '#faf5ff', label: 'Purple' }, // Purple-50
];

function StepItem({
    step,
    index,
    total,
    onToggle,
    onDelete,
    onAddSubStep,
    onDeleteSubStep,
    onReorder,
    onToggleExpand,
    onColorChange,
    level = 0,
    numbering = ""
}) {
    const [isAddingSubStep, setIsAddingSubStep] = useState(false);
    const [subStepText, setSubStepText] = useState('');
    const [showColorPalette, setShowColorPalette] = useState(false);

    const currentNumbering = numbering ? `${numbering}.${index + 1}` : `${index + 1}`;
    const hasChildren = step.children && step.children.length > 0;

    const handleAddSubStep = () => {
        if (!subStepText.trim()) return;
        onAddSubStep(step.id, subStepText);
        setSubStepText('');
        setIsAddingSubStep(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleAddSubStep();
        }
    };

    const stepStyle = {
        backgroundColor: step.color || '#ffffff',
        borderLeft: 'none' // Remove previous border style
    };

    return (
        <div
            id={`step-${step.id}`}
            className="step-wrapper"
            style={{ marginLeft: level > 0 ? 'var(--spacing-xl)' : '0' }}
        >
            <div className={`step-item ${step.completed ? 'completed' : ''}`} style={stepStyle}>
                <div
                    className="step-marker"
                    onClick={() => onToggle(step.id)}
                    title={step.completed ? "Mark as incomplete" : "Mark as complete"}
                    style={step.completed ? { backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', color: 'white' } : {}}
                >
                    {currentNumbering}
                </div>

                <div className="step-content-wrapper">
                    <div className="step-content">
                        {step.text}
                    </div>

                    <div className="step-actions">
                        <button
                            className="action-button"
                            onClick={() => setIsAddingSubStep(!isAddingSubStep)}
                            title="Add detail"
                        >
                            ＋詳細
                        </button>

                        {hasChildren && (
                            <button
                                className="action-button expand-button"
                                onClick={() => onToggleExpand(step.id)}
                                title={step.expanded ? "Collapse" : "Expand"}
                            >
                                {step.expanded ? "非表示" : "表示"}
                            </button>
                        )}

                        <div className="reorder-buttons">
                            <button
                                className="action-button"
                                onClick={() => onReorder(step.id, 'up')}
                                disabled={index === 0}
                                title="Move up"
                            >
                                ↑
                            </button>
                            <button
                                className="action-button"
                                onClick={() => onReorder(step.id, 'down')}
                                disabled={index === total - 1}
                                title="Move down"
                            >
                                ↓
                            </button>
                        </div>

                        <div className="color-palette-container">
                            <button
                                className="action-button"
                                onClick={() => setShowColorPalette(!showColorPalette)}
                                title="Change Color"
                            >
                                色を変更
                            </button>
                            {showColorPalette && (
                                <div className="color-palette-popup">
                                    {COLOR_PALETTE.map((swatch) => (
                                        <div
                                            key={swatch.color}
                                            className="color-swatch"
                                            style={{ backgroundColor: swatch.color }}
                                            onClick={() => {
                                                onColorChange(step.id, swatch.color);
                                                setShowColorPalette(false);
                                            }}
                                            title={swatch.label}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            className="delete-button"
                            onClick={() => onDelete(step.id)}
                            title="Delete step"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div>

            {isAddingSubStep && (
                <div className="sub-step-input">
                    <input
                        type="text"
                        placeholder="詳細を入力..."
                        value={subStepText}
                        onChange={(e) => setSubStepText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                    <button onClick={handleAddSubStep}>追加</button>
                    <button
                        className="cancel-button"
                        onClick={() => {
                            setIsAddingSubStep(false);
                            setSubStepText('');
                        }}
                    >
                        キャンセル
                    </button>
                </div>
            )}

            {step.expanded && hasChildren && (
                <div className="sub-steps-list">
                    {step.children.map((child, idx) => (
                        <StepItem
                            key={child.id}
                            step={child}
                            index={idx}
                            total={step.children.length}
                            onToggle={onToggle}
                            onDelete={onDelete}
                            onAddSubStep={onAddSubStep}
                            onReorder={onReorder}
                            onToggleExpand={onToggleExpand}
                            onColorChange={onColorChange}
                            level={level + 1}
                            numbering={currentNumbering}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default StepItem;
