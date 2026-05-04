import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, 
    query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCSVpk8WQvtLac3QaUDqB-8Blm1KssUWus",
    authDomain: "robot-software-board.firebaseapp.com",
    projectId: "robot-software-board",
    storageBucket: "robot-software-board.firebasestorage.app",
    messagingSenderId: "453334293243",
    appId: "1:453334293243:web:cd1a09d9dd02dd4016ae5e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let posts = [];
let currentPostId = null;

// ==========================================
// 💡 관리자용 마스터 비밀번호
// ==========================================
const ADMIN_PASSWORD = "admin"; 

const viewList = document.getElementById('view-list');
const viewWrite = document.getElementById('view-write');
const viewDetail = document.getElementById('view-detail');

document.addEventListener('DOMContentLoaded', () => {
    window.renderPosts();
});

window.hideAll = function() {
    viewList.style.display = 'none';
    viewWrite.style.display = 'none';
    viewDetail.style.display = 'none';
};

window.showListView = function() {
    window.hideAll();
    viewList.style.display = 'block';
    // 게시글 목록 갱신
    window.renderPosts();
};

window.showWriteView = function(isEdit = false) {
    window.hideAll();
    viewWrite.style.display = 'block';
    
    const titleEl = document.getElementById('write-title');
    const pwGroup = document.getElementById('password-group');
    const pwInput = document.getElementById('post-password-input');
    
    if (isEdit && currentPostId) {
        titleEl.innerText = "게시글 수정";
        pwGroup.style.display = 'none'; // 수정 모드 전환 시에는 비번 입력창 숨김
        pwInput.required = false;

        const post = posts.find(p => p.id === currentPostId);
        document.getElementById('post-id').value = post.id;
        document.getElementById('post-title-input').value = post.title;
        document.getElementById('post-author-input').value = post.author;
        document.getElementById('post-author-input').disabled = true; // 수정 시 작성자는 고정
        document.getElementById('post-content-input').value = post.content;
    } else {
        titleEl.innerText = "게시글 작성";
        pwGroup.style.display = 'block';
        pwInput.required = true; // 새 글 작성할 때는 비번 필수

        document.getElementById('post-form').reset();
        document.getElementById('post-id').value = '';
        document.getElementById('post-author-input').disabled = false;
        currentPostId = null;
    }
};

window.showDetailView = function(id) {
    window.hideAll();
    viewDetail.style.display = 'block';
    currentPostId = id;
    
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    document.getElementById('detail-title').innerText = post.title;
    document.getElementById('detail-author').innerText = "작성자: " + post.author;
    document.getElementById('detail-date').innerText = "작성일: " + post.date;
    document.getElementById('detail-content').innerText = post.content;
    
    window.renderComments(post);
};

window.renderPosts = async function() {
    const tbody = document.getElementById('board-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">데이터를 불러오는 중입니다...</td></tr>';
    
    try {
        const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        posts = [];
        querySnapshot.forEach((docSnap) => {
            posts.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        tbody.innerHTML = '';
        if(posts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">작성된 글이 없습니다. 새로운 글을 작성해보세요!</td></tr>';
            return;
        }

        posts.forEach((post, index) => {
            const tr = document.createElement('tr');
            tr.onclick = () => window.showDetailView(post.id);
            const commentCount = post.comments ? post.comments.length : 0;
            tr.innerHTML = `
                <td>${posts.length - index}</td>
                <td>${post.title} <b>[${commentCount}]</b></td>
                <td>${post.author}</td>
                <td>${post.date}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Firestore Read Error:", e);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Firebase 데이터 조회 오류. 파이어베이스 규칙을 확인하세요.</td></tr>';
    }
};

window.handlePostSubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('post-id').value;
    const title = document.getElementById('post-title-input').value;
    const author = document.getElementById('post-author-input').value;
    const content = document.getElementById('post-content-input').value;
    const password = document.getElementById('post-password-input').value;
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "저장 중...";
    
    try {
        if (id) {
            // 게시글 수정
            const postRef = doc(db, "posts", id);
            await updateDoc(postRef, {
                title: title,
                content: content
            });
            alert("수정되었습니다.");
            
            const idx = posts.findIndex(p => p.id === id);
            if(idx > -1) { 
                posts[idx].title = title; 
                posts[idx].content = content; 
            }
            window.showDetailView(id);
        } else {
            // 게시글 작성
            await addDoc(collection(db, "posts"), {
                title: title,
                author: author,
                content: content,
                date: dateStr,
                comments: [],
                timestamp: today.getTime(),
                password: password || "" // 💡 비밀번호 암호 없이 저장 (현 단계 구조)
            });
            alert("작성 완료!");
            window.showListView();
        }
    } catch(e) {
        console.error("Firestore Write Error:", e);
        alert("저장에 실패했습니다. 관리자 모드 권한이나 파이어베이스 규칙을 확인해보세요.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "저장하기";
    }
};

// ==========================================
// 💡 기능: 게시글 수정 & 검증
// ==========================================
window.editPost = function() {
    const post = posts.find(p => p.id === currentPostId);
    if (!post) return;
    
    const inputPw = prompt("게시글 수정\n작성 시 입력했던 [비밀번호]를 입력하세요.\n(관리자는 'admin' 입력)");
    if (inputPw === null) return; // 취소
    
    // 검증: 본인 비밀번호이거나, 관리자 비밀번호인 경우 접근 허용
    if (inputPw === post.password || inputPw === ADMIN_PASSWORD) {
        window.showWriteView(true);
    } else {
        alert("비밀번호가 일치하지 않습니다!");
    }
};

// ==========================================
// 💡 기능: 게시글 삭제 & 검증
// ==========================================
window.deletePost = async function() {
    const post = posts.find(p => p.id === currentPostId);
    if (!post) return;
    
    const inputPw = prompt("게시글 삭제\n작성 시 입력했던 [비밀번호]를 입력하세요.\n(관리자는 'admin' 입력)");
    if (inputPw === null) return; // 취소
    
    // 검증: 본인 비밀번호이거나, 관리자 비밀번호인 경우 접근 허용
    if (inputPw === post.password || inputPw === ADMIN_PASSWORD) {
        if(confirm('정말로 이 게시글 전체를 삭제하시겠습니까?')) {
            try {
                await deleteDoc(doc(db, "posts", currentPostId));
                alert("정상적으로 삭제되었습니다.");
                window.showListView();
            } catch(e) {
                console.error("Firestore Delete Error:", e);
                alert("삭제 처리에 실패했습니다.");
            }
        }
    } else {
        alert("비밀번호가 일치하지 않습니다.");
    }
};

// ==========================================
// 💡 기능: 댓글 관련 로직
// ==========================================
window.renderComments = function(post) {
    const list = document.getElementById('comment-list');
    list.innerHTML = '';
    const comments = post.comments || [];
    document.getElementById('comment-count').innerText = comments.length;
    
    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        // 댓글 항목에 삭제 버튼 추가 (비밀번호 체크)
        div.innerHTML = `
            <span><b>${c.author}</b>: ${c.text}</span>
            <span class="comment-actions" style="margin-left:auto;">
                <button class="btn btn-secondary" style="padding:0.2rem 0.5rem; font-size:0.8rem;" onclick="window.deleteComment(${c.id}, event)">삭제</button>
            </span>
        `;
        list.appendChild(div);
    });
};

window.handleAddComment = async function(e) {
    e.preventDefault();
    const input = document.getElementById('comment-input');
    const authorInput = document.getElementById('comment-author');
    const passwordInput = document.getElementById('comment-password');
    
    const text = input.value.trim();
    const author = authorInput.value.trim() || "익명";
    const password = passwordInput.value.trim();
    
    if(!text) return;
    
    const post = posts.find(p => p.id === currentPostId);
    if(post) {
        const newComment = {
            id: new Date().getTime(),
            text: text,
            author: author,
            password: password
        };
        
        const updatedComments = post.comments ? [...post.comments, newComment] : [newComment];
        
        try {
            const postRef = doc(db, "posts", currentPostId);
            await updateDoc(postRef, {
                comments: updatedComments
            });
            post.comments = updatedComments; // 로컬 최신화
            
            // 폼 초기화
            input.value = '';
            authorInput.value = '';
            passwordInput.value = '';
            window.renderComments(post);
        } catch(e) {
            console.error("Firestore Comment Error:", e);
            alert("댓글 작성에 실패했습니다.");
        }
    }
};

window.deleteComment = async function(commentId, event) {
    if(event) event.stopPropagation();
    
    const post = posts.find(p => p.id === currentPostId);
    if(!post) return;
    
    const targetComment = post.comments.find(c => c.id === commentId);
    if(!targetComment) return;
    
    const inputPw = prompt("댓글 삭제: 댓글 작성 시 설정한 [비밀번호]를 입력하세요.\n(관리팀은 'admin' 입력)");
    if(inputPw === null) return;
    
    // 댓글 삭제 권한 검증: 댓글 비번 동일 OR 게시글 관리자 기능 (관리자는 모든 게시글/댓글 삭제 가능)
    const isValid = (targetComment.password && inputPw === targetComment.password) || 
                    (inputPw === ADMIN_PASSWORD);
                    
    if(isValid) {
        if(!confirm('이 댓글을 삭제할까요?')) return;
        
        const updatedComments = post.comments.filter(c => c.id !== commentId);
        try {
            const postRef = doc(db, "posts", currentPostId);
            await updateDoc(postRef, {
                comments: updatedComments
            });
            post.comments = updatedComments;
            window.renderComments(post);
        } catch(e) {
            console.error("Firestore Comment Delete Error:", e);
            alert("댓글 삭제에 실패했습니다.");
        }
    } else {
        alert("비밀번호가 일치하지 않습니다!");
    }
};
