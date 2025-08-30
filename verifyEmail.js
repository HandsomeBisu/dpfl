import { applyActionCode } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { auth } from "../firebase/config.js";

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const actionCode = urlParams.get('oobCode');
    const continueUrl = urlParams.get('continueUrl');

    const formBox = document.querySelector('.form-box');

    if (mode === 'verifyEmail' && actionCode) {
        try {
            await applyActionCode(auth, actionCode);
            formBox.innerHTML = `
                <h1>이메일 인증 완료</h1>
                <p>계정이 인증되었습니다.<br>이제 로그인 할 수 있습니다.</p>
                <a href="${continueUrl || '/login.html'}" class="btn">로그인 페이지로 이동</a>
            `;
        } catch (error) {
            console.error("Email verification error:", error);
            formBox.innerHTML = `
                <h1>인증 실패</h1>
                <p>이메일 인증에 실패했습니다.<br>링크가 만료되었거나 이미 사용되었을 수 있습니다.</p>
                <a href="/login.html" class="btn">로그인 페이지로 이동</a>
            `;
        }
    }
});
