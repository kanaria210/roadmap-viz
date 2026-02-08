import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot as firestoreOnSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import StepItem from '../step-item/StepItem';
import Sidebar from '../sidebar/Sidebar';
import { findItemDeep, removeItemDeep, insertItemDeep } from '../../utils/dnd-utils';
import '../../styles/global.css';
import '../../styles/App.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, background: '#fee', color: '#333' }}>
                    <h1>Something went wrong.</h1>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

function RoadmapEditorContent({ user }) {
    const { roadmapId } = useParams();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [goal, setGoal] = useState('');
    const [steps, setSteps] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [newStepText, setNewStepText] = useState('');

    useEffect(() => {
        if (!roadmapId) return;

        // 1. Fetch Metadata (Title, Goal)
        const unsubscribeMetadata = firestoreOnSnapshot(doc(db, 'users', user.uid, 'roadmaps', roadmapId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setTitle(data.title || '');
                setGoal(data.goal);
                // Note: steps are no longer here
            }
        });

        // 2. Fetch Steps (Separate Collection)
        const unsubscribeSteps = firestoreOnSnapshot(doc(db, 'users', user.uid, 'roadmap_steps', roadmapId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setSteps(data.steps || []);
            } else {
                setSteps([]); // Initialize if empty
            }
        });

        return () => {
            unsubscribeMetadata();
            unsubscribeSteps();
        };
    }, [roadmapId, user]);

    const updateSteps = async (newSteps) => {
        setSteps(newSteps);
        if (roadmapId) {
            // Save ONLY steps to the new collection
            await setDoc(doc(db, 'users', user.uid, 'roadmap_steps', roadmapId), { steps: newSteps }, { merge: true });
        }
    };

    const handleTitleChange = (e) => {
        setTitle(e.target.value);
    };

    const handleTitleBlur = () => {
        if (roadmapId) {
            setDoc(doc(db, 'users', user.uid, 'roadmaps', roadmapId), { title: title }, { merge: true });
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [activeId, setActiveId] = useState(null);

    const handleAddStep = () => {
        if (!newStepText.trim()) return;
        const newStep = {
            id: Date.now().toString(),
            text: newStepText,
            completed: false,
            expanded: true,
            children: []
        };
        const newSteps = [...steps, newStep];
        updateSteps(newSteps);
        setNewStepText('');
    };

    const toggleStep = (id) => {
        const toggleDeep = (items) => items.map(item => {
            if (item.id === id) return { ...item, completed: !item.completed };
            if (item.children) return { ...item, children: toggleDeep(item.children) };
            return item;
        });
        updateSteps(toggleDeep(steps));
    };

    const deleteStep = (id) => {
        const newSteps = removeItemDeep(steps, id);
        updateSteps(newSteps);
    };

    const addSubStep = (parentId, text) => {
        const newSubStep = { id: Date.now().toString(), text, completed: false, children: [] };
        const newSteps = insertItemDeep(steps, parentId, 'inside', newSubStep);
        updateSteps(newSteps);
    };

    const reorderStep = () => { };

    const toggleExpand = (id) => {
        const toggleExpandDeep = (items) => items.map(item => {
            if (item.id === id) return { ...item, expanded: !item.expanded };
            if (item.children) return { ...item, children: toggleExpandDeep(item.children) };
            return item;
        });
        updateSteps(toggleExpandDeep(steps));
    };

    const updateStepColor = (id, color) => {
        const setDeep = (items) => items.map(item => {
            if (item.id === id) return { ...item, color };
            if (item.children) return { ...item, children: setDeep(item.children) };
            return item;
        });
        updateSteps(setDeep(steps));
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;
        if (active.id === over.id) return;

        const activeItem = findItemDeep(steps, active.id);
        if (!activeItem) return;

        let position = 'after';
        const newSteps = removeItemDeep(steps, active.id);
        const finalSteps = insertItemDeep(newSteps, over.id, position, activeItem);

        updateSteps(finalSteps);
    };

    return (
        <div className="app-wrapper">
            <Sidebar
                steps={steps}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="app-main-content">
                <div className="app-container">
                    <header className="app-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', position: 'relative' }}>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                position: 'absolute',
                                left: 0,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2em',
                                color: '#666',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            ← <span style={{ fontSize: '0.8em' }}>Top</span>
                        </button>
                        <input
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            onBlur={handleTitleBlur}
                            placeholder="Untitled Roadmap"
                            style={{
                                fontSize: '2em',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                border: 'none',
                                background: 'transparent',
                                width: '100%',
                                outline: 'none',
                                color: '#333'
                            }}
                        />
                    </header>

                    <div className="step-input-container">
                        <input
                            type="text"
                            value={newStepText}
                            onChange={(e) => setNewStepText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.nativeEvent.isComposing || e.key !== 'Enter') return;
                                handleAddStep();
                            }}
                            placeholder="新しいステップを入力..."
                            className="step-input"
                        />
                        <button onClick={handleAddStep} className="add-button">
                            追加
                        </button>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={steps.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="step-list">
                                {steps.map((step, index) => (
                                    <StepItem
                                        key={step.id}
                                        step={step}
                                        index={index}
                                        total={steps.length}
                                        onToggle={toggleStep}
                                        onDelete={deleteStep}
                                        onAddSubStep={addSubStep}
                                        onReorder={reorderStep}
                                        onToggleExpand={toggleExpand}
                                        onColorChange={updateStepColor}
                                        level={0}
                                        numbering=""
                                    />
                                ))}
                            </div>
                        </SortableContext>

                        <DragOverlay>
                            {activeId ? (
                                <StepItem
                                    step={findItemDeep(steps, activeId)}
                                    // Pass dummy props for overlay render
                                    index={0}
                                    total={1}
                                    onToggle={() => { }}
                                    onDelete={() => { }}
                                    onAddSubStep={() => { }}
                                    onReorder={() => { }}
                                    onToggleExpand={() => { }}
                                    onColorChange={() => { }}
                                    level={0}
                                    numbering=""
                                    isOverlay={true}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                </div>
            </div>
        </div>
    );
}

function RoadmapEditor(props) {
    return (
        <ErrorBoundary>
            <RoadmapEditorContent {...props} />
        </ErrorBoundary>
    );
}

export default RoadmapEditor;
