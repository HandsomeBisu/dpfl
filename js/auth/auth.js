import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { auth, db } from "../firebase/config.js";

const actionCodeSettings = {
    url: window.location.origin + '/login.html',
    handleCodeInApp: true
};

function showInputError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearInputErrors() {
    const errorElements = document.querySelectorAll('.input-error');
    errorElements.forEach(el => el.textContent = '');
}

export function handleSignup() {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return;

    const submitButton = signupForm.querySelector('button[type="submit"]');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearInputErrors();
        submitButton.disabled = true;
        submitButton.textContent = '가입 중...';

        const username = signupForm.username.value;
        const email = signupForm.email.value;
        const password = signupForm.password.value;
        const confirmPassword = signupForm['confirm-password'].value;
        const termsAgree = signupForm['terms-agree'].checked;
        const privacyAgree = signupForm['privacy-agree'].checked;

        let hasError = false;

        if (!username) {
            showInputError('username', '이름을 입력해주세요.');
            hasError = true;
        }

        if (password !== confirmPassword) {
            showInputError('confirm-password', '비밀번호가 일치하지 않습니다.');
            hasError = true;
        }

        if (!termsAgree || !privacyAgree) {
            showInputError('agree', '이용약관과 개인정보 처리방침에 모두 동의해야 합니다.');
            hasError = true;
        }

        if (hasError) {
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
            if (error.code === 'auth/email-already-in-use') {
                showInputError('email', '이미 사용 중인 이메일입니다.');
            } else if (error.code === 'auth/weak-password') {
                showInputError('password', '비밀번호는 6자 이상이어야 합니다.');
            } else if (error.code === 'auth/invalid-email') {
                showInputError('email', '유효하지 않은 이메일 형식입니다.');
            } else {
                showInputError('confirm-password', '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
            }
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
        clearInputErrors();
        submitButton.disabled = true;
        submitButton.textContent = '로그인 중...';

        const email = loginForm.email.value;
        const password = loginForm.password.value;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                await signOut(auth);
                showInputError('password', '이메일 인증이 필요합니다. 메일함을 확인해주세요.');
                submitButton.disabled = false;
                submitButton.textContent = '로그인';
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("Login Error:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showInputError('password', '이메일 또는 비밀번호가 올바르지 않습니다.');
            } else if (error.code === 'auth/invalid-email') {
                showInputError('email', '유효하지 않은 이메일 형식입니다.');
            } else {
                showInputError('password', '이메일 또는 비밀번호가 올바른지 확인하세요.');
            }
            submitButton.disabled = false;
            submitButton.textContent = '로그인';
        }
    });
}