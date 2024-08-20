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

    const addNoteButton = document.querySelector('.confirm-button[title="Add Note"]');
    if (addNoteButton) {
        addNoteButton.addEventListener('click', function(event) {
            console.log('Add note button clicked');
        });
    }

    const commentButtons = document.querySelectorAll('.note-actions .confirm-button:not([type="submit"])');
    commentButtons.forEach(button => {
        button.addEventListener('click', toggleComments);
    });

    initImageModal();

    const deleteButtons = document.querySelectorAll('.delete-note-button');
    deleteButtons.forEach(button => {
        button.addEventListener('click', handleDeleteNoteButton);
    });

    initDeleteNoteModal();

    const commentForms = document.querySelectorAll('.comment-form');
    commentForms.forEach(form => {
        const imageInput = form.querySelector('input[type="file"]');
        let previewContainer = form.querySelector('.comment-image-preview');
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.className = 'comment-image-preview';
            form.insertBefore(previewContainer, form.querySelector('button'));
        }

        imageInput.addEventListener('change', function(event) {
            handleImagePreview(event, previewContainer);
        });

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

    const imageModals = noteElement.querySelectorAll('.image-modal');
    imageModals.forEach(modal => {
        const pzContainer = modal.querySelector('.pinch-zoom-container');
        if (pzContainer && pzContainer.pinchZoom) {
            pzContainer.pinchZoom.update();
        }
    });
}

function initAddNotePage() {
    console.log('Add note page initialized');
    const form = document.querySelector('#add-note-form');
    const imageInput = document.getElementById('id_image');
    const contentInput = document.getElementById('id_content');
    const previewContainer = document.createElement('div');
    previewContainer.className = 'image-preview';
    form.insertBefore(previewContainer, form.lastElementChild);

    imageInput.addEventListener('change', function(event) {
        handleImagePreview(event, previewContainer);
    });

    form.addEventListener('submit', function(event) {
        const content = contentInput.value.trim();
        const image = imageInput.files[0];
        
        if (!content && !image) {
            event.preventDefault();
            alert('Please enter note content or upload an image.');
        }
    });
}

function toggleComments(e) {
    e.preventDefault();
    e.stopPropagation();

    const button = e.target.closest('.confirm-button');
    if (!button || button.classList.contains('delete-note-button')) {
        return;
    }
    console.log('Comment button clicked');
    const noteElement = this.closest('.note');
    const commentsContent = noteElement.querySelector('.comments-content');
    
    if (commentsContent.style.display === 'none') {
        commentsContent.style.display = 'block';
        setTimeout(() => {
            commentsContent.classList.add('show');
        }, 0);
        setTimeout(() => {
            adjustNoteLayout(noteElement);
        }, 300);
    } else {
        commentsContent.classList.remove('show');
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
    const content = form.querySelector('textarea').value.trim();
    const image = form.querySelector('input[type="file"]').files[0];
    
    if (!content && !image) {
        alert('Please provide either content or an image.');
        return;
    }

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
            const commentsList = commentsContent.querySelector('.comments-list');
            if (commentsList) {
                const newComment = createCommentElement(data.comment);
                commentsList.appendChild(newComment);
            } else {
                const newCommentsList = document.createElement('div');
                newCommentsList.className = 'comments-list';
                const newComment = createCommentElement(data.comment);
                newCommentsList.appendChild(newComment);
                commentsContent.insertBefore(newCommentsList, form);
            }

            const previewContainer = form.querySelector('.comment-image-preview');
            if (previewContainer) {
                previewContainer.innerHTML = '';
            }

            form.reset();

            commentsContent.style.display = 'block';
            commentsContent.classList.add('show');

            adjustNoteLayout(noteElement);

            initImageModal();

            updateCommentCount(noteElement, 1);
        } else {
            if (data.errors && data.errors.__all__) {
                alert(data.errors.__all__[0]);
            } else {
                alert('Error adding comment: ' + (data.errors || 'Unknown error'));
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while submitting the comment.');
    });
}

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
        ${comment.content ? `<p>${comment.content}</p>` : ''}
        ${comment.image ? `
        <div class="comment-image-container">
            <img src="${comment.image}" alt="Comment image" class="comment-image thumbnail">
            <div class="image-modal">
                <span class="close">&times;</span>
                <div class="pinch-zoom-container">
                    <img class="modal-content" src="${comment.image}">
                </div>
            </div>
        </div>
        ` : ''}
    `;
    return commentDiv;
}

function updateCommentCount(noteElement, increment) {
    const commentButton = noteElement.querySelector('.note-actions .confirm-button:not([type="submit"])');
    if (commentButton) {
        const currentCount = parseInt(commentButton.textContent.match(/\d+/)[0]);
        const newCount = currentCount + increment;
        commentButton.textContent = `Comments (${newCount})`;
    }
}

function handleImagePreview(event, previewContainer) {
    if (!previewContainer) {
        console.error('Preview container not found');
        return;
    }
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
    const deleteUrl = this.dataset.deleteUrl; 
    const deleteNoteModal = document.getElementById('delete-note-modal');
    const deleteNoteForm = document.getElementById('delete-note-form');
    
    if (deleteUrl) {
        deleteNoteForm.action = deleteUrl;  
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
                window.location.reload();
            } else {
                console.error('Delete failed');
            }
        }).catch(error => {
            console.error('Error:', error);
        });
    });

    confirmDeleteNoButton.addEventListener('click', function() {
        deleteNoteModal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === deleteNoteModal) {
            deleteNoteModal.style.display = 'none';
        }
    });
}

function initImageModal() {
    const thumbnails = document.querySelectorAll('.note-image-container .thumbnail, .comment-image-container .thumbnail');

    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            const fullSizeImage = new Image();
            fullSizeImage.src = this.src;
            fullSizeImage.style.maxWidth = '100%';
            fullSizeImage.style.maxHeight = '100%';
            fullSizeImage.style.objectFit = 'contain';

            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.zIndex = '1000';

            modal.appendChild(fullSizeImage);
            document.body.appendChild(modal);

            let scale = 1;
            let panning = false;
            let pointX = 0;
            let pointY = 0;
            let start = { x: 0, y: 0 };

            function setTransform() {
                fullSizeImage.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
            }

            fullSizeImage.addEventListener('mousedown', (e) => {
                e.preventDefault();
                start = { x: e.clientX - pointX, y: e.clientY - pointY };
                panning = true;
            });

            modal.addEventListener('mousemove', (e) => {
                if (!panning) return;
                pointX = e.clientX - start.x;
                pointY = e.clientY - start.y;
                setTransform();
            });

            modal.addEventListener('mouseup', () => {
                panning = false;
            });

            modal.addEventListener('wheel', (e) => {
                e.preventDefault();
                const xs = (e.clientX - pointX) / scale;
                const ys = (e.clientY - pointY) / scale;
                const delta = -e.deltaY;
                if (delta > 0) {
                    scale *= 1.2;
                } else {
                    scale /= 1.2;
                }
                pointX = e.clientX - xs * scale;
                pointY = e.clientY - ys * scale;
                setTransform();
            });

            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        });
    });
}