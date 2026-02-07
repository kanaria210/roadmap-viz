import { useState } from 'react';
import '../../styles/App.css';

function SidebarItem({ step, numbering, onScroll }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = step.children && step.children.length > 0;

    const handleClick = (e) => {
        // If clicking the text, scroll to the item
        e.stopPropagation();
        onScroll(step.id);
    };

    const handleToggle = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="sidebar-item-container">
            <div className="sidebar-item-header">
                {hasChildren ? (
                    <button
                        className="sidebar-toggle"
                        onClick={handleToggle}
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                ) : (
                    <span className="sidebar-spacer"></span>
                )}
                <span
                    className="sidebar-link"
                    onClick={handleClick}
                    title={step.text}
                >
                    {numbering} {step.text}
                </span>
            </div>

            {isExpanded && hasChildren && (
                <div className="sidebar-children">
                    {step.children.map((child, index) => (
                        <SidebarItem
                            key={child.id}
                            step={child}
                            numbering={`${numbering}.${index + 1}`}
                            onScroll={onScroll}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Sidebar({ steps }) {
    const handleScroll = (id) => {
        const element = document.getElementById(`step-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="sidebar">
            <h3 className="sidebar-title">目次</h3>
            <div className="sidebar-content">
                {steps.map((step, index) => (
                    <SidebarItem
                        key={step.id}
                        step={step}
                        numbering={`${index + 1}`}
                        onScroll={handleScroll}
                    />
                ))}
            </div>
        </div>
    );
}
