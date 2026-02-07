import { useState, useEffect } from 'react';
import './styles/global.css';
import './styles/App.css';
import StepItem from './components/step-item/StepItem';
import Sidebar from './components/sidebar/Sidebar';
import Login from './components/auth/Login';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Data states
  const [goal, setGoal] = useState('');
  const [steps, setSteps] = useState([]);
  const [newStep, setNewStep] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 1. Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync with Firestore (Read)
  useEffect(() => {
    if (!user) {
      setSteps([]);
      setGoal('');
      setIsDataLoaded(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGoal(data.goal || '');
        setSteps(data.steps || []);
      } else {
        // New user or no data yet
        setGoal('');
        setSteps([]);
      }
      setIsDataLoaded(true);
    }, (error) => {
      console.error("Error reading data:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Sync to Firestore (Write) - Debounced or on change
  // Note: To avoid infinite loops with onSnapshot, we only write when triggered by user actions
  // But for simplicity in this React model, we can write on effect *if* data captures local changes.
  // However, writing on every render caused by onSnapshot update is bad.
  // Better approach for MVP: 
  // - Create a separate save function
  // - Or use a ref to track if the update came from remote or local.
  // - simplest for now: Just save on every change, but check if it's different?
  // Actually, let's write a `saveToCloud` function and call it in each handler (addStep, toggleStep, etc).
  // This is safer than useEffect which might fight with onSnapshot.

  const saveToCloud = async (newGoal, newSteps) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        goal: newGoal,
        steps: newSteps,
        lastUpdated: new Date()
      }, { merge: true });
    } catch (e) {
      console.error("Error saving to cloud:", e);
    }
  };

  // Wrapper for state updates that also saves to cloud
  const updateGoal = (val) => {
    setGoal(val);
    saveToCloud(val, steps); // Debounce ideally, but direct for now
  };

  const updateSteps = (newSteps) => {
    setSteps(newSteps);
    saveToCloud(goal, newSteps);
  };

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
          /* Note: We don't toggle children completion automatically based on request,
             but if we wanted to, we could. Current logic just toggles the item. */
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

  // Render Loading State
  if (loadingAuth) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>Loading...</div>;
  }

  // Render Login if not authenticated
  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-wrapper">
      <Sidebar steps={steps} />

      <div className="app-main-content">
        <div className="app-container">
          <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="あなたの目標を入力..."
                className="title-input"
                value={goal}
                onChange={(e) => updateGoal(e.target.value)}
              />
            </div>
            <button
              onClick={() => signOut(auth)}
              style={{
                marginLeft: '20px',
                padding: '8px 12px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#666'
              }}
            >
              ログアウト
            </button>
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

          {/* We don't need the local reset button anymore since we are using cloud data */}
        </div>
      </div>
    </div>
  );
}

export default App;
