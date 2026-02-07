import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../firebase";

export default function Login() {
    const signIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
            alert("ログインに失敗しました: " + error.message);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: '20px'
        }}>
            <h2>Roadmap Viz にようこそ</h2>
            <p>利用を開始するには Google アカウントでログインしてください</p>
            <button
                onClick={signIn}
                style={{
                    padding: '10px 20px',
                    fontSize: '1rem',
                    backgroundColor: '#4285F4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}
            >
                Google でログイン
            </button>
        </div>
    );
}
