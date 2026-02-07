import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import StepItem from '../step-item/StepItem';
import Sidebar from '../sidebar/Sidebar';
import '../../styles/global.css'; // Ensure styles are imported
import '../../styles/App.css';

function RoadmapEditor({ user }) {
    const { roadmapId } = useParams();
    const navigate = useNavigate();

    // Data states
    const [goal, setGoal] = useState('');
    const [steps, setSteps] = useState([]);
    const [newStep, setNewStep] = useState('');
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [roadmapTitle, setRoadmapTitle] = useState('無題のロードマップ');

    // 1. Sync with Firestore (Read)
    useEffect(() => {
        if (!user || !roadmapId) return;

        const roadmapDocRef = doc(db, 'users', user.uid, 'roadmaps', roadmapId);
        const unsubscribe = onSnapshot(roadmapDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setGoal(data.goal || '');
                setSteps(data.steps || []);
                setRoadmapTitle(data.title || '無題のロードマップ');
            } else {
                // Document doesn't exist? Maybe deleted.
                // For now, let's just show empty or redirect?
                // Let's assume valid ID for now.
            }
            setIsDataLoaded(true);
        }, (error) => {
            console.error("Error reading data:", error);
        });

        return () => unsubscribe();
    }, [user, roadmapId]);

    // 2. Sync to Firestore (Write)
    const saveToCloud = async (newGoal, newSteps, newTitle) => {
        if (!user || !roadmapId) return;
        try {
            await setDoc(doc(db, 'users', user.uid, 'roadmaps', roadmapId), {
                goal: newGoal !== undefined ? newGoal : goal,
                steps: newSteps !== undefined ? newSteps : steps,
                title: newTitle !== undefined ? newTitle : roadmapTitle,
                lastUpdated: new Date()
            }, { merge: true });
        } catch (e) {
            console.error("Error saving to cloud:", e);
        }
    };

    // Wrapper for state updates
    const updateGoal = (val) => {
        setGoal(val);
        saveToCloud(val, undefined, undefined);
    };

    const updateSteps = (newSteps) => {
        setSteps(newSteps);
        saveToCloud(undefined, newSteps, undefined);
    };

    // Helper functions (addStep, toggleStep, etc.) - copied from App.jsx
    const addStep = () => {
        if (!newStep.trim()) return;
        const newSteps = [...steps, {
            id: Date.now(),
            text: newStep,
            completed: false,
            expanded: true,
            color: '#e2e8f0',
            children: []
        }];
        updateSteps(newSteps);
        setNewStep('');
    };

    const addSubStep = (parentId, text) => {
        const addRecursive = (items) => {
            return items.map(item => {
                if (item.id === parentId) {
                    return {
                        ...item,
                        expanded: true,
                        children: [...(item.children || []), {
                            id: Date.now(),
                            text: text,
                            completed: false,
                            expanded: true,
                            color: item.color,
                            children: []
                        }]
                    };
                }
                if (item.children) {
                    return { ...item, children: addRecursive(item.children) };
                }
                return item;
            });
        };
        updateSteps(addRecursive(steps));
    };

    const toggleStep = (id) => {
        const toggleRecursive = (items) => {
            return items.map(item => {
                if (item.id === id) {
                    return { ...item, completed: !item.completed };
                }
                if (item.children) {
                    return { ...item, children: toggleRecursive(item.children) };
                }
                return item;
            });
        };
        updateSteps(toggleRecursive(steps));
    };

    const toggleExpand = (id) => {
        const collapseAllChildren = (items) => {
            return items.map(item => ({
                ...item,
                expanded: false,
                children: item.children ? collapseAllChildren(item.children) : []
            }));
        };

        const toggleRecursive = (items) => {
            return items.map(item => {
                if (item.id === id) {
                    const newExpandedState = !item.expanded;
                    if (!newExpandedState && item.children) {
                        return {
                            ...item,
                            expanded: newExpandedState,
                            children: collapseAllChildren(item.children)
                        };
                    }
                    return { ...item, expanded: newExpandedState };
                }
                if (item.children) {
                    return { ...item, children: toggleRecursive(item.children) };
                }
                return item;
            });
        };
        updateSteps(toggleRecursive(steps));
    };

    const deleteStep = (id) => {
        const deleteRecursive = (items) => {
            return items
                .filter(item => item.id !== id)
                .map(item => {
                    if (item.children) {
                        return { ...item, children: deleteRecursive(item.children) };
                    }
                    return item;
                });
        };
        updateSteps(deleteRecursive(steps));
    };

    const reorderStep = (id, direction) => {
        const reorderRecursive = (items) => {
            const index = items.findIndex(item => item.id === id);
            if (index !== -1) {
                const newItems = [...items];
                if (direction === 'up' && index > 0) {
                    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
                    return newItems;
                }
                if (direction === 'down' && index < newItems.length - 1) {
                    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
                    return newItems;
                }
                return items;
            }
            return items.map(item => {
                if (item.children) {
                    return { ...item, children: reorderRecursive(item.children) };
                }
                return item;
            });
        };
        updateSteps(reorderRecursive(steps));
    };

    const updateStepColor = (id, newColor) => {
        const updateColorRecursive = (items, applyToChildren = false) => {
            return items.map(item => {
                if (item.id === id) {
                    return {
                        ...item,
                        color: newColor,
                        children: item.children ? updateColorRecursive(item.children, true) : []
                    };
                }
                if (applyToChildren) {
                    return {
                        ...item,
                        color: newColor,
                        children: item.children ? updateColorRecursive(item.children, true) : []
                    };
                }
                if (item.children) {
                    return { ...item, children: updateColorRecursive(item.children, false) };
                }
                return item;
            });
        };
        updateSteps(updateColorRecursive(steps));
    };

    if (!isDataLoaded) {
        return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Loading Roadmap...</div>;
    }

    return (
        <div className="app-wrapper">
            <Sidebar steps={steps} />

            <div className="app-main-content">
                <div className="app-container">
                    <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            {/* Back Button */}
                            <div style={{ alignSelf: 'flex-start' }}>
                                <button
                                    onClick={() => navigate('/')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#666',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    ← 一覧に戻る
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder="無題のロードマップ"
                                className="title-input"
                                value={roadmapTitle}
                                onChange={(e) => {
                                    setRoadmapTitle(e.target.value);
                                    saveToCloud(undefined, undefined, e.target.value);
                                }}
                                style={{ fontSize: '1.5rem', borderBottom: '1px solid transparent' }}
                            />
                            <input
                                type="text"
                                placeholder="あなたの目標を入力..."
                                className="title-input"
                                value={goal}
                                onChange={(e) => updateGoal(e.target.value)}
                            />
                        </div>
                    </header>

                    <div className="step-input-container">
                        <input
                            type="text"
                            placeholder="次のステップを入力..."
                            className="step-input-field"
                            value={newStep}
                            onChange={(e) => setNewStep(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    addStep();
                                }
                            }}
                        />
                        <button className="add-button" onClick={addStep}>
                            追加
                        </button>
                    </div>

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
                </div>
            </div>
        </div>
    );
}

export default RoadmapEditor;
