import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { auth, db } from "../firebase/config.js";
import { showCustomAlert } from "../ui/alerts.js";

const actionCodeSettings = {
    url: window.location.origin + '/login.html',
    handleCodeInApp: true
};

export function handleSignup() {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return;

    const submitButton = signupForm.querySelector('button[type="submit"]');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = '가입 중...';

        const username = signupForm.username.value;
        const email = signupForm.email.value;
        const password = signupForm.password.value;
        const confirmPassword = signupForm['confirm-password'].value;

        if (password !== confirmPassword) {
            showCustomAlert('비밀번호가 일치하지 않습니다.');
            submitButton.disabled = false;
            submitButton.textContent = '회원가입';
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user, actionCodeSettings);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                username: username,
                email: email,
                createdAt: new Date()
            });
            await signOut(auth);
            window.location.href = 'verify-email.html';
        } catch (error) {
            console.error("Signup Error:", error);
            let message = "회원가입에 실패했습니다. ";
            if (error.code === 'auth/email-already-in-use') {
                message += '이미 사용 중인 이메일입니다.';
            } else if (error.code === 'auth/weak-password') {
                message += '비밀번호는 6자 이상이어야 합니다.';
            } else {
                message += '네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.';
            }
            showCustomAlert(message);
            submitButton.disabled = false;
            submitButton.textContent = '회원가입';
        }
    });
}

export function handleLogin() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    const submitButton = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = '로그인 중...';

        const email = loginForm.email.value;
        const password = loginForm.password.value;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                await signOut(auth);
                showCustomAlert("이메일 인증이 필요합니다. 메일함을 확인해주세요.");
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("Login Error:", error);
            showCustomAlert("로그인 실패: 이메일 또는 비밀번호가 올바르지 않습니다.");
            submitButton.disabled = false;
            submitButton.textContent = '로그인';
        }
    });
}
