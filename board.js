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
    window.renderPosts();
};

window.showWriteView = function(isEdit = false) {
    window.hideAll();
    viewWrite.style.display = 'block';
    const titleEl = document.getElementById('write-title');
    
    if (isEdit && currentPostId) {
        titleEl.innerText = "게시글 수정";
        const post = posts.find(p => p.id === currentPostId);
        document.getElementById('post-id').value = post.id;
        document.getElementById('post-title-input').value = post.title;
        document.getElementById('post-author-input').value = post.author;
        document.getElementById('post-author-input').disabled = true;
        document.getElementById('post-content-input').value = post.content;
    } else {
        titleEl.innerText = "게시글 작성";
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
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Firebase 데이터 조회 오류. 콘솔 로그를 확인하세요.</td></tr>';
    }
};

window.handlePostSubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('post-id').value;
    const title = document.getElementById('post-title-input').value;
    const author = document.getElementById('post-author-input').value;
    const content = document.getElementById('post-content-input').value;
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "저장 중...";
    
    try {
        if (id) {
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
            await addDoc(collection(db, "posts"), {
                title: title,
                author: author,
                content: content,
                date: dateStr,
                comments: [],
                timestamp: today.getTime()
            });
            alert("작성 완료!");
            window.showListView();
        }
    } catch(e) {
        console.error("Firestore Write Error:", e);
        alert("저장에 실패했습니다. 관리자 모드 권한이나 규칙을 확인해보세요.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "저장하기";
    }
};

window.editPost = function() {
    window.showWriteView(true);
};

window.deletePost = async function() {
    if(confirm('이 글을 정말 삭제하시겠습니까?')) {
        try {
            await deleteDoc(doc(db, "posts", currentPostId));
            alert("정상적으로 삭제되었습니다.");
            window.showListView();
        } catch(e) {
            console.error("Firestore Delete Error:", e);
            alert("삭제에 실패했습니다.");
        }
    }
};

window.renderComments = function(post) {
    const list = document.getElementById('comment-list');
    list.innerHTML = '';
    const comments = post.comments || [];
    document.getElementById('comment-count').innerText = comments.length;
    
    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
            <span><b>${c.author}</b>: ${c.text}</span>
            <span class="comment-actions" onclick="window.deleteComment(${c.id})">삭제</span>
        `;
        list.appendChild(div);
    });
};

window.handleAddComment = async function(e) {
    e.preventDefault();
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if(!text) return;
    
    const post = posts.find(p => p.id === currentPostId);
    if(post) {
        const newComment = {
            id: new Date().getTime(),
            text: text,
            author: "익명"
        };
        
        const updatedComments = post.comments ? [...post.comments, newComment] : [newComment];
        
        try {
            const postRef = doc(db, "posts", currentPostId);
            await updateDoc(postRef, {
                comments: updatedComments
            });
            post.comments = updatedComments;
            input.value = '';
            window.renderComments(post);
        } catch(e) {
            console.error("Firestore Comment Error:", e);
            alert("댓글 작성에 실패했습니다.");
        }
    }
};

window.deleteComment = async function(commentId) {
    if(!confirm('이 댓글을 삭제할까요?')) return;
    const post = posts.find(p => p.id === currentPostId);
    if(post) {
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
    }
};
