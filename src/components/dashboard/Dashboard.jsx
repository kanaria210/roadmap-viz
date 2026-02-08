import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { signOut } from 'firebase/auth';

import '../../styles/global.css';

function Dashboard({ user }) {
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        const roadmapsRef = collection(db, 'users', user.uid, 'roadmaps');
        const q = query(roadmapsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("Dashboard Snapshot Update:", snapshot.size, "docs");
            const maps = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log(" - Doc:", doc.id, data.title, "Created:", data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
                return {
                    id: doc.id,
                    ...data
                };
            });
            setRoadmaps(maps);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching roadmaps:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const createNewRoadmap = async () => {
        if (!user) return;
        try {
            const docRef = await addDoc(collection(db, 'users', user.uid, 'roadmaps'), {
                title: '新しいロードマップ',
                goal: '',
                steps: [],
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
            navigate(`/map/${docRef.id}`);
        } catch (e) {
            console.error("Error creating roadmap:", e);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent navigation
        if (!window.confirm('本当にこのロードマップを削除しますか？')) return;

        try {
            await deleteDoc(doc(db, 'users', user.uid, 'roadmaps', id));
        } catch (error) {
            console.error("Error deleting roadmap:", error);
        }
    };

    const handleLogout = () => {
        signOut(auth);
    };

    return (
        <div className="dashboard-container" style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>マイロードマップ</h1>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {user.photoURL && <img src={user.photoURL} alt="User" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                        <span style={{ color: '#64748b' }}>{user.displayName || user.email}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '8px 16px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            background: 'white',
                            cursor: 'pointer',
                            color: '#64748b'
                        }}
                    >
                        ログアウト
                    </button>
                </div>
            </header >

            {
                loading ? (
                    <div style={{ textAlign: 'center', color: '#64748b' }} > 読み込み中...</div >
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                        {/* Create New Card */}
                        <div
                            onClick={createNewRoadmap}
                            style={{
                                background: '#f8fafc',
                                border: '2px dashed #cbd5e1',
                                borderRadius: '12px',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                cursor: 'pointer',
                                minHeight: '200px',
                                transition: 'all 0.2s'
                            }}
                            className="roadmap-card new-card"
                        >
                            <div style={{ fontSize: '3rem', color: '#94a3b8', marginBottom: '10px' }}>+</div>
                            <div style={{ color: '#64748b', fontWeight: 'bold' }}>新規作成</div>
                        </div>

                        {/* Roadmap Cards */}
                        {roadmaps.map(map => (
                            <div
                                key={map.id}
                                onClick={() => navigate(`/map/${map.id}`)}
                                style={{
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '200px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    transition: 'transform 0.2s',
                                    position: 'relative'
                                }}
                                className="roadmap-card"
                            >
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '10px', color: '#1e293b' }}>
                                        {map.title || '無題のロードマップ'}
                                    </h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {map.goal || '目標未設定'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        {map.lastUpdated?.toDate ? map.lastUpdated.toDate().toLocaleDateString() : '---'}
                                    </span>
                                    <button
                                        onClick={(e) => handleDelete(e, map.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            padding: '4px'
                                        }}
                                        title="削除"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
}

export default Dashboard;
