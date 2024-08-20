document.addEventListener('DOMContentLoaded', function() {
    console.log('Notebook script loaded');
    
    const isNotebookPage = document.querySelector('#notes-list') !== null;
    const isAddNotePage = document.querySelector('#add-note') !== null;

    if (isNotebookPage) {
        initNotebookPage();
    } else if (isAddNotePage) {
        initAddNotePage();
    }
});

function initNotebookPage() {
    console.log('Notebook page initialized');

    // 處理新增 note 按鈕
    const addNoteButton = document.querySelector('.confirm-button[title="Add Note"]');
    if (addNoteButton) {
        addNoteButton.addEventListener('click', function(event) {
            // 這裡不需要阻止默認行為，因為我們希望它導航到新增 note 的頁面
            console.log('Add note button clicked');
        });
    }

    // 處理評論按鈕點擊
    const commentButtons = document.querySelectorAll('.note-actions .confirm-button:not([type="submit"])');
    commentButtons.forEach(button => {
        button.addEventListener('click', toggleComments);
    });

    // 處理刪除筆記的確認
    const deleteButtons = document.querySelectorAll('.delete-note-button');
    deleteButtons.forEach(button => {
        button.addEventListener('click', handleDeleteNoteButton);
    });

    // 初始化刪除筆記模態窗口
    initDeleteNoteModal();

    // 處理評論表單提交
    const commentForms = document.querySelectorAll('.comment-form');
    commentForms.forEach(form => {
        form.addEventListener('submit', handleCommentSubmit);
    });

    window.addEventListener('resize', () => {
        const notes = document.querySelectorAll('.note');
        notes.forEach(adjustNoteLayout);
    });
}

function adjustNoteLayout(noteElement) {
    noteElement.style.width = '100%';
    noteElement.style.maxWidth = '100%';
    
    const children = noteElement.children;
    for (let child of children) {
        child.style.maxWidth = '100%';
        child.style.boxSizing = 'border-box';
    }

    // 處理圖片
    const images = noteElement.querySelectorAll('img');
    images.forEach(img => {
        if (!img.complete) {
            img.onload = () => adjustNoteLayout(noteElement);
        }
    });
}

function initAddNotePage() {
    console.log('Add note page initialized');
    const form = document.querySelector('form');
    const imageInput = document.getElementById('note-image');
    const previewContainer = document.createElement('div');
    previewContainer.className = 'image-preview';
    form.insertBefore(previewContainer, form.lastElementChild);

    imageInput.addEventListener('change', handleImagePreview);

    form.addEventListener('submit', function(event) {
        const content = document.getElementById('note-content').value.trim();
        if (!content) {
            event.preventDefault();
            alert('Please enter note content');
        }
    });
}

function toggleComments(e) {
    e.preventDefault();
    e.stopPropagation();  // 阻止事件冒泡

    const button = e.target.closest('.confirm-button');
    if (!button || button.classList.contains('delete-note-button')) {
        return;
    }
    console.log('Comment button clicked');
    const noteElement = this.closest('.note');
    const commentsContent = noteElement.querySelector('.comments-content');
    
    if (commentsContent.style.display === 'none') {
        commentsContent.style.display = 'block';
        // 使用 setTimeout 來確保 display 更改後再添加 show 類
        setTimeout(() => {
            commentsContent.classList.add('show');
        }, 0);
        setTimeout(() => {
            adjustNoteLayout(noteElement);
        }, 300);
    } else {
        commentsContent.classList.remove('show');
        // 等待過渡效果完成後再隱藏元素
        setTimeout(() => {
            commentsContent.style.display = 'none';
        }, 300);
    }
}

function handleCommentSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const noteElement = form.closest('.note');
    const commentsContent = noteElement.querySelector('.comments-content');

    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 動態添加新評論
            const commentsList = commentsContent.querySelector('.comments-list');
            if (commentsList) {
                const newComment = createCommentElement(data.comment);
                commentsList.appendChild(newComment);
            } else {
                // 如果評論列表不存在，創建一個新的
                const newCommentsList = document.createElement('div');
                newCommentsList.className = 'comments-list';
                const newComment = createCommentElement(data.comment);
                newCommentsList.appendChild(newComment);
                commentsContent.insertBefore(newCommentsList, form);
            }

            // 清空評論表單
            form.reset();

            // 確保評論區域保持可見
            commentsContent.style.display = 'block';
            commentsContent.classList.add('show');

            // 調整佈局
            adjustNoteLayout(noteElement);
        } else {
            alert('Error adding comment: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while submitting the comment.');
    });
}

// 輔助函數：創建新的評論元素
function createCommentElement(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
        <div class="comment-header">
            ${comment.author.profile_picture ? 
              `<img src="${comment.author.profile_picture}" alt="${comment.author.username}" class="user-avatar">` :
              `<div class="user-avatar-placeholder">${comment.author.username.charAt(0).toUpperCase()}</div>`
            }
            <span class="author-name">${comment.author.username}</span>
            <span class="comment-date">on ${comment.created_at}</span>
        </div>
        <p>${comment.content}</p>
        ${comment.image ? `<div class="comment-image-container"><img src="${comment.image}" alt="Comment image" class="comment-image"></div>` : ''}
    `;
    return commentDiv;
}

function handleImagePreview(event) {
    const previewContainer = document.querySelector('.image-preview');
    previewContainer.innerHTML = '';
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                const maxWidth = screenWidth * 0.8;
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                const previewImg = document.createElement('img');
                previewImg.src = canvas.toDataURL('image/jpeg');
                previewImg.className = 'preview-image';
                previewContainer.appendChild(previewImg);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function handleDeleteNoteButton(event) {
    event.preventDefault();
    event.stopPropagation();
    const deleteUrl = this.dataset.deleteUrl;  // 使用從 Django 模板獲取的 URL
    const deleteNoteModal = document.getElementById('delete-note-modal');
    const deleteNoteForm = document.getElementById('delete-note-form');
    
    if (deleteUrl) {
        deleteNoteForm.action = deleteUrl;  // 使用從 Django 模板獲取的 URL
        deleteNoteModal.style.display = 'block';
    } else {
        console.error('Delete URL not found');
    }
}

function initDeleteNoteModal() {
    const deleteNoteModal = document.getElementById('delete-note-modal');
    const confirmDeleteYesButton = document.getElementById('confirm-delete-note-yes');
    const confirmDeleteNoButton = document.getElementById('confirm-delete-note-no');
    const deleteNoteForm = document.getElementById('delete-note-form');

    confirmDeleteYesButton.addEventListener('click', function(event) {
        event.preventDefault();
        // 確保表單中包含 CSRF token
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const formData = new FormData(deleteNoteForm);
        formData.append('csrfmiddlewaretoken', csrfToken);

        fetch(deleteNoteForm.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        }).then(response => {
            if (response.ok) {
                window.location.reload();  // 刷新頁面或進行其他操作
            } else {
                console.error('Delete failed');
                // 顯示錯誤消息
            }
        }).catch(error => {
            console.error('Error:', error);
        });
    });

    confirmDeleteNoButton.addEventListener('click', function() {
        deleteNoteModal.style.display = 'none';
    });

    // 點擊模態窗口外部關閉
    window.addEventListener('click', function(event) {
        if (event.target === deleteNoteModal) {
            deleteNoteModal.style.display = 'none';
        }
    });
}