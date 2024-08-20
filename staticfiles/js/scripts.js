document.addEventListener("DOMContentLoaded", function() {
    initializeFunctions();
});

// 初始化各種功能的函數
function initializeFunctions() {
    // 首先隱藏 Crop 按鈕
    var cropButton = document.getElementById('crop-button');
    if (cropButton) {cropButton.style.display = 'none';}
    // Profile photo handleing
    if (document.body.classList.contains('register-page')) {
        if (document.getElementById('profile-photo')) {handleProfilePhoto();}
    } else if (document.body.classList.contains('account-settings-page')) {
        if (document.getElementById('profile-photo')) {handleAccountSettingsPhoto();}
    }
    // QR code handling
    if (document.getElementById('qr-code')) {handleQRCodeUpload();}
    // Password reset handling
    if (document.getElementById('change-password-btn')) {handleChangePassword();}
    // 初始化 Select2
    if (document.getElementById('bill-members')) {initializeSelect2();}
    // Add expense form handling
    if (document.querySelector('#add-expense form')) {handleAddExpenseForm();}
    // 初始化匯率轉換功能
    if (document.getElementById('currency-exchange-button')) {handleCurrencyExchange();}
    // Split type handling
    if (document.getElementById('split_type')) {handleSplitType();}
    // Expense photo upload
    if (document.getElementById('edit-expense-photo')) {
        handleExpensePhoto('edit-expense-photo', 'edit-expense-photo-preview', 'edit-expense-photo-preview-container', 'edit-expense-photo-data');
    }
    // Edit expense modal window logic
    if (document.getElementById('edit-expense-modal')) {handleEditExpenseModal();}
    // Delete expense button handling
    if (document.getElementById('delete-expense-button')) {handleDeleteExpenseButton();}
    // Calculate button functionality
    if (document.getElementById('calculate-button')) {handleCalculateButton();}
    // Delete bill button handling
    if (document.getElementById('delete-bill-button')) {handleDeleteBillButton();}
    // Friend list profile
    if (document.querySelector('.friends-section')) {
        loadFriendAvatars();
        handleFriendProfileModal();
    }
    // Friend profile modal window logic
    if (document.getElementById('friend-profile-modal')) {handleFriendProfileModal();}
    // Remove friend button handling
    if (document.querySelectorAll('.remove-friend-button').length) {handleRemoveFriendButton();}
}


function handleProfilePhoto() {
    const profilePhoto = document.getElementById('profile-photo');
    const cropContainer = document.getElementById('crop-container');
    const cropperImage = document.getElementById('cropper');
    const cropButton = document.getElementById('crop-button');
    const profilePicturePreview = document.getElementById('profile-picture-preview');
    const profilePictureData = document.getElementById('profile-picture-data');
    const profilePictureContainer = document.querySelector('.profile-picture-container');
    
    let cropper;

    profilePhoto.addEventListener('change', handleFileSelect);
    cropButton.addEventListener('click', cropImage);

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const maxWidth = Math.min(300, window.innerWidth - 40);
                const maxHeight = Math.min(300, window.innerHeight - 200);
                let width = img.width;
                let height = img.height;
    
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
    
                cropperImage.width = width;
                cropperImage.height = height;
                cropperImage.src = event.target.result;
                initCropper();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function initCropper() {
        if (cropper) {
            cropper.destroy();
        }
    
        cropContainer.style.display = 'block';
        cropper = new Cropper(cropperImage, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
            responsive: true,
            restore: false,
            center: false,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
            minCropBoxWidth: 200,
            minCropBoxHeight: 200,
            ready: function () {
                const cropBoxData = this.cropper.getCropBoxData();
                const size = Math.min(cropBoxData.width, cropBoxData.height, 200);
                this.cropper.setCropBoxData({
                    width: size,
                    height: size
                });
                
                const cropBox = this.cropper.cropBox;
                cropBox.style.borderRadius = '50%';
                cropBox.style.overflow = 'hidden';
            }
        });
        cropButton.style.display = 'block';
    }

    function cropImage() {
        const croppedCanvas = cropper.getCroppedCanvas({
            width: 200,
            height: 200
        });

        profilePicturePreview.src = croppedCanvas.toDataURL('image/jpeg');
        profilePictureContainer.style.display = 'block';
        profilePictureData.value = croppedCanvas.toDataURL('image/jpeg');

        cropContainer.style.display = 'none';
        cropButton.style.display = 'none';
        profilePicturePreview.style.display = 'block';

        croppedCanvas.toBlob(function(blob) {
            const file = new File([blob], "profile.jpg", { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            profilePhoto.files = dataTransfer.files;
        }, 'image/jpeg');
    }
}

function handleAccountSettingsPhoto() {
    const profilePhoto = document.getElementById('profile-photo');
    const cropContainer = document.getElementById('crop-container');
    const cropperImage = document.getElementById('cropper');
    const cropButton = document.getElementById('crop-button');
    const profilePictureContainer = document.querySelector('.profile-picture-container');
    
    let cropper;

    profilePhoto.addEventListener('change', handleFileSelect);
    cropButton.addEventListener('click', cropImage);

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const maxWidth = Math.min(300, window.innerWidth - 40);
                const maxHeight = Math.min(300, window.innerHeight - 200);
                let width = img.width;
                let height = img.height;
    
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
    
                cropperImage.width = width;
                cropperImage.height = height;
                cropperImage.src = event.target.result;
                cropContainer.style.display = 'block';
                initCropper();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function initCropper() {
        if (cropper) {
            cropper.destroy();
        }
    
        cropper = new Cropper(cropperImage, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
            responsive: true,
            restore: false,
            center: false,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
            minCropBoxWidth: 200,
            minCropBoxHeight: 200,
            ready: function () {
                const cropBoxData = this.cropper.getCropBoxData();
                const size = Math.min(cropBoxData.width, cropBoxData.height, 200);
                this.cropper.setCropBoxData({
                    width: size,
                    height: size
                });
                
                const cropBox = this.cropper.cropBox;
                cropBox.style.borderRadius = '50%';
                cropBox.style.overflow = 'hidden';
            }
        });
        cropButton.style.display = 'block';
    }

    function cropImage() {
        if (!cropper) return;

        const croppedCanvas = cropper.getCroppedCanvas({
            width: 200,
            height: 200,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        if (!croppedCanvas) return;

        const currentProfilePicture = profilePictureContainer.querySelector('.current-profile-picture');
        const profilePicturePreview = profilePictureContainer.querySelector('#profile-picture-preview');
        
        if (currentProfilePicture) {
            currentProfilePicture.style.display = 'none';
        }
        
        profilePicturePreview.src = croppedCanvas.toDataURL('image/jpeg');
        profilePicturePreview.style.display = 'block';
        profilePicturePreview.style.width = '200px';
        profilePicturePreview.style.height = '200px';
        profilePicturePreview.style.objectFit = 'cover';
        profilePicturePreview.style.borderRadius = '50%';
        
        cropContainer.style.display = 'none';
        cropButton.style.display = 'none';

        croppedCanvas.toBlob(function(blob) {
            if (!blob) return;
            const file = new File([blob], "profile.jpg", { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            profilePhoto.files = dataTransfer.files;
        }, 'image/jpeg');
    }
}

function handleQRCodeUpload() {
    var qrCodeInput = document.getElementById('qr-code');
    var previewContainer = document.getElementById('qr-code-preview-container');

    qrCodeInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(event) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                var scaleFactor = Math.min(200 / img.width, 200 / img.height);
                canvas.width = img.width * scaleFactor;
                canvas.height = img.height * scaleFactor;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                var resizedImage = new Image();
                resizedImage.src = canvas.toDataURL('image/jpeg');
                resizedImage.className = 'qr-code-preview';
                resizedImage.alt = 'QR Code';

                previewContainer.innerHTML = '';
                previewContainer.appendChild(resizedImage);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function handleChangePassword() {
    const changePasswordBtn = document.getElementById('change-password-btn');
    const modal = document.getElementById('change-password-modal');
    const closeBtn = modal.querySelector('.modal-content .close-button');
    const form = document.getElementById('password-change-form');
    const errorDiv = document.getElementById('password-change-errors');
    
    function closeModal() {
        modal.style.display = 'none';
        form.reset();
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    changePasswordBtn.addEventListener('click', function(event) {
        event.preventDefault();
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', closeModal);

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }

        const formData = new FormData(form);

        fetch('/change_password_ajax/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                let messagesContainer = document.querySelector('.messages');
                if (!messagesContainer) {
                    messagesContainer = document.createElement('div');
                    messagesContainer.className = 'messages';
                    document.querySelector('#profile-form').prepend(messagesContainer);
                }

                const successMessage = document.createElement('div');
                successMessage.className = 'success';
                successMessage.textContent = data.message;

                messagesContainer.innerHTML = '';
                messagesContainer.appendChild(successMessage);

                closeModal();
                messagesContainer.scrollIntoView({ behavior: 'smooth' });
            } else {
                if (errorDiv) {
                    errorDiv.innerHTML = Object.values(data.errors).flat().join('<br>');
                    errorDiv.style.display = 'block';
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            if (errorDiv) {
                errorDiv.textContent = 'An error occurred. Please try again.';
                errorDiv.style.display = 'block';
            }
        });
    });
}

function initializeSelect2() {
    function formatState(state) {
        if (!state.id) {
            return state.text;
        }
        var baseUrl = state.element.getAttribute('data-img-src');
        var $state = $(
            '<span><img src="' + baseUrl + '" class="img-flag" /> ' + state.text + '</span>'
        );
        return $state;
    }

    $('#bill-members').select2({
        theme: 'default',
        width: '100%',
        templateResult: formatState,
        templateSelection: formatState,
        placeholder: 'Select group members',
        allowClear: true
    }).on('change', function() {
        // 清除錯誤訊息當選擇改變時
        $('#bill-members-error').text('');
    });

    // 在表單提交時驗證
    $('form').on('submit', function(e) {
        var selectedMembers = $('#bill-members').val();
        if (!selectedMembers || selectedMembers.length === 0) {
            e.preventDefault(); // 阻止表單提交
            $('#bill-members-error').text('Please select at least one group member.');
            // 聚焦到 Select2 元素
            $('#bill-members').select2('open');
        }
    });
}

function handleAddExpenseForm() {
    const addExpenseForm = document.querySelector('#add-expense form');
    const addSplitTypeSelect = document.getElementById('split_type');
    const addParticipantsSection = document.getElementById('participants-section');
    const addErrorMessage = document.createElement('p');
    addErrorMessage.style.color = 'red';
    addExpenseForm.prepend(addErrorMessage);

    function toggleParticipantsSection(splitType, participantsSection) {
        if (splitType === 'custom') {
            participantsSection.style.display = 'block';
        } else {
            participantsSection.style.display = 'none';
            const checkboxes = participantsSection.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                const input = document.getElementById(`participant_amount_${checkbox.value}`);
                if (input) {
                    input.style.display = 'none';
                    input.value = '';
                }
            });
        }
    }

    function toggleAmountInput(checkbox) {
        const input = document.getElementById(`participant_amount_${checkbox.value}`);
        if (input) {
            if (checkbox.checked) {
                input.style.display = 'inline';
            } else {
                input.style.display = 'none';
                input.value = '';
            }
        }
    }

    addSplitTypeSelect.addEventListener('change', function() {
        toggleParticipantsSection(this.value, addParticipantsSection);
    });

    const addCheckboxes = document.querySelectorAll('#participants input[type="checkbox"]');
    addCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            toggleAmountInput(this);
        });
    });

    // 處理照片上傳和預覽
    const expensePhotoInput = document.getElementById('expense-photo');
    const expensePhotoPreview = document.getElementById('expense-photo-preview');
    const expensePhotoPreviewContainer = document.getElementById('expense-photo-preview-container');

    expensePhotoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                expensePhotoPreview.src = event.target.result;
                expensePhotoPreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // 點擊預覽圖片放大
    expensePhotoPreview.addEventListener('click', function() {
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

        modal.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    });

    addExpenseForm.addEventListener('submit', function(event) {
        if (addSplitTypeSelect.value === 'custom') {
            const participantsData = {};
            let totalAmount = 0;
            const checkboxes = document.querySelectorAll('#participants input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                const input = document.getElementById(`participant_amount_${checkbox.value}`);
                if (input) {
                    const amount = parseFloat(input.value);
                    if (isNaN(amount) || amount <= 0) {
                        event.preventDefault();
                        addErrorMessage.textContent = 'Please enter valid amounts for all participants.';
                        return;
                    }
                    totalAmount += amount;
                    participantsData[checkbox.value] = amount;
                }
            });
            const totalExpenseAmount = parseFloat(document.getElementById('amount').value);
            if (totalAmount !== totalExpenseAmount) {
                event.preventDefault();
                addErrorMessage.textContent = 'Total participants amount must equal the expense amount.';
                return;
            }
        }
    });
}

function handleCurrencyExchange() {
    const currencyExchangeButton = document.getElementById('currency-exchange-button');
    const currencyExchangeModal = document.getElementById('currency-exchange-modal');
    const closeButton = currencyExchangeModal.querySelector('.close-button');
    const exchangeForm = document.getElementById('currency-exchange-form');
    const conversionResult = document.getElementById('conversion-result');

    let exchangeRates = {};

    currencyExchangeButton.addEventListener('click', function() {
        currencyExchangeModal.style.display = 'block';
        loadExchangeRates();
    });

    closeButton.addEventListener('click', function() {
        currencyExchangeModal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === currencyExchangeModal) {
            currencyExchangeModal.style.display = 'none';
        }
    });

    exchangeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        convertCurrency();
    });

    function loadExchangeRates() {
        fetch('/get_exchange_rates/')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    exchangeRates = data.rates;
                    populateCurrencyDropdowns();
                } else {
                    console.error('Failed to load exchange rates:', data.error);
                }
            })
            .catch(error => console.error('Error:', error));
    }

    function populateCurrencyDropdowns() {
        const fromCurrency = document.getElementById('from-currency');
        const toCurrency = document.getElementById('to-currency');
        fromCurrency.innerHTML = '<option value="JPY">JPY</option><option value="TWD">TWD</option>';
        toCurrency.innerHTML = '<option value="TWD">TWD</option>';
    
        for (let currency in exchangeRates) {
            if (currency !== 'TWD') {
                fromCurrency.innerHTML += `<option value="${currency}">${currency}</option>`;
                toCurrency.innerHTML += `<option value="${currency}">${currency}</option>`;
            }
        }
    }

    function convertCurrency() {
        const amount = document.getElementById('amount-to-convert').value;
        const fromCurrency = document.getElementById('from-currency').value;
        const toCurrency = document.getElementById('to-currency').value;
    
        fetch(`/convert/?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('conversion-result').textContent = 
                        `${amount} ${fromCurrency} = ${data.result} ${toCurrency}`;
                } else {
                    document.getElementById('conversion-result').textContent = 
                        `Error: ${data.error}`;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('conversion-result').textContent = 
                    'An error occurred during conversion';
            });
    }
}

function handleSplitType() {
    var splitTypeElement = document.getElementById('split_type');
    function toggleParticipantInputs(value) {
        var participantsSection = document.getElementById('participants-section');
        if (participantsSection) {
            if (value === 'custom') {
                participantsSection.style.display = 'block';
            } else {
                participantsSection.style.display = 'none';
            }
        } else {
            console.warn("participants-section element not found");
        }
    }

    function toggleCustomInput(checkbox) {
        var customInput = document.querySelector('input[name="participant_amount_' + checkbox.value + '"]');
        if (customInput) {
            if (checkbox.checked) {
                customInput.style.display = 'inline';
            } else {
                customInput.style.display = 'none';
            }
        } else {
            console.warn("Custom input element for participant not found: " + checkbox.value);
        }
    }

    var splitType = splitTypeElement.value;
    toggleParticipantInputs(splitType);

    splitTypeElement.addEventListener('change', function() {
        toggleParticipantInputs(this.value);
    });

    var participantCheckboxes = document.querySelectorAll('input[name="participants"]');
    participantCheckboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            toggleCustomInput(this);
        });
    });

    participantCheckboxes.forEach(function(checkbox) {
        toggleCustomInput(checkbox);
    });
}

function handleExpensePhoto(inputId, previewId, previewContainerId, dataInputId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const previewContainer = document.getElementById(previewContainerId);
    const dataInput = document.getElementById(dataInputId);

    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            preview.src = event.target.result;
            previewContainer.style.display = 'block';
            dataInput.value = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 添加點擊預覽圖片放大的功能
    preview.addEventListener('click', function() {
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

        modal.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    });
}

function handleEditExpenseModal() {
    const modal = document.getElementById('edit-expense-modal');
    const closeButton = modal.querySelector('.close-button');
    const descriptionLinks = document.querySelectorAll('.description-link');
    const editForm = document.getElementById('edit-expense-form');
    const deleteButton = document.getElementById('delete-expense-button');
    const splitTypeSelect = document.getElementById('edit-split_type');
    const participantsSection = document.getElementById('edit-participants-section');
    const editErrorMessage = document.createElement('p');
    editErrorMessage.style.color = 'red';
    editForm.prepend(editErrorMessage);

    function toggleParticipantsSection(splitType, participantsSection) {
        if (splitType === 'custom') {
            participantsSection.style.display = 'block';
        } else {
            participantsSection.style.display = 'none';
            const checkboxes = participantsSection.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                const input = document.getElementById(`edit_participant_amount_${checkbox.value}`);
                if (input) {
                    input.style.display = 'none';
                    input.value = '';
                }
            });
        }
    }

    function toggleEditAmountInput(checkbox) {
        const input = document.getElementById(`edit_participant_amount_${checkbox.value}`);
        if (input) {
            if (checkbox.checked) {
                input.style.display = 'inline';
            } else {
                input.style.display = 'none';
                input.value = '';
            }
        }
    }

    splitTypeSelect.addEventListener('change', function() {
        toggleParticipantsSection(this.value, participantsSection);
        const checkboxes = participantsSection.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            toggleEditAmountInput(checkbox);
        });
    });

    const editCheckboxes = document.querySelectorAll('#edit-participants input[type="checkbox"]');
    editCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            toggleEditAmountInput(this);
        });
    });

    // 處理照片上傳和預覽
    const editExpensePhotoInput = document.getElementById('edit-expense-photo');
    const editExpensePhotoPreview = document.getElementById('edit-expense-photo-preview');
    const editExpensePhotoPreviewContainer = document.getElementById('edit-expense-photo-preview-container');

    editExpensePhotoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                editExpensePhotoPreview.src = event.target.result;
                editExpensePhotoPreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // 點擊預覽圖片放大
    editExpensePhotoPreview.addEventListener('click', function() {
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

        modal.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    });

    descriptionLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const expenseId = this.getAttribute('data-expense-id');

            fetch(`/get_expense_data/${expenseId}/`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    document.getElementById('edit-description').value = data.description;
                    document.getElementById('edit-amount').value = data.amount;
                    document.getElementById('edit-paid_by').value = data.paid_by;
                    document.getElementById('edit-split_type').value = data.split_type;

                    toggleParticipantsSection(data.split_type, participantsSection);

                    const checkboxes = document.querySelectorAll('#edit-participants input[type="checkbox"]');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = false;
                        const input = document.getElementById(`edit_participant_amount_${checkbox.value}`);
                        if (input) {
                            input.style.display = 'none';
                            input.value = '';
                        }
                    });

                    if (data.split_type === 'custom') {
                        data.participants.forEach(participant => {
                            const checkbox = document.getElementById(`edit_participant_${participant.user_id}`);
                            if (checkbox) {
                                checkbox.checked = true;
                                const input = document.getElementById(`edit_participant_amount_${participant.user_id}`);
                                if (input) {
                                    input.style.display = 'inline';
                                    input.value = participant.amount;
                                }
                            }
                        });
                    }

                    // 處理照片預覽
                    if (data.photo_url) {
                        editExpensePhotoPreview.src = data.photo_url;
                        editExpensePhotoPreviewContainer.style.display = 'block';
                    } else {
                        editExpensePhotoPreviewContainer.style.display = 'none';
                    }

                    editForm.setAttribute('action', `/edit_expense/${expenseId}/`);
                    deleteButton.setAttribute('data-expense-id', expenseId);
                    modal.style.display = 'block';
                })
                .catch(error => {
                    console.error('There has been a problem with your fetch operation:', error);
                });
        });
    });

    closeButton.addEventListener('click', function() {
        modal.style.display = 'none';
        editErrorMessage.textContent = '';
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            editErrorMessage.textContent = '';
        }
    });

    editForm.addEventListener('submit', function(event) {
        event.preventDefault();
        editErrorMessage.textContent = '';

        var formData = new FormData(editForm);

        const splitType = splitTypeSelect.value;
        if (splitType === 'custom') {
            const participantsData = {};
            let totalAmount = 0;
            const checkboxes = document.querySelectorAll('#edit-participants input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                const input = document.getElementById(`edit_participant_amount_${checkbox.value}`);
                if (input) {
                    const amount = parseFloat(input.value);
                    if (isNaN(amount) || amount <= 0) {
                        editErrorMessage.textContent = 'Please enter valid amounts for all participants.';
                        return;
                    }
                    totalAmount += amount;
                    participantsData[checkbox.value] = amount;
                }
            });
            const totalExpenseAmount = parseFloat(document.getElementById('edit-amount').value);
            if (totalAmount !== totalExpenseAmount) {
                editErrorMessage.textContent = 'Total participants amount must equal the expense amount.';
                return;
            }
            formData.append('participant_amounts', JSON.stringify(participantsData));
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', editForm.action, true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                if (response.success) {
                    modal.style.display = 'none';
                    location.reload();
                } else {
                    editErrorMessage.textContent = response.message;
                    console.error('An error occurred during the update:', response.message);
                }
            } else {
                editErrorMessage.textContent = 'An error occurred during the update.';
                console.error('An error occurred during the update:', xhr.responseText);
            }
        };
        xhr.send(formData);
    });
}

function handleDeleteExpenseButton() {
    const deleteExpenseButton = document.getElementById('delete-expense-button');
    const deleteExpenseModal = document.getElementById('delete-expense-modal');
    const confirmDeleteYesButton = document.getElementById('confirm-delete-expense-yes');
    const confirmDeleteNoButton = document.getElementById('confirm-delete-expense-no');
    const editExpenseModal = document.getElementById('edit-expense-modal');

    if (deleteExpenseButton) {
        deleteExpenseButton.addEventListener('click', function(event) {
            event.preventDefault();
            deleteExpenseModal.style.display = 'block';
        });
    }

    if (confirmDeleteYesButton) {
        confirmDeleteYesButton.addEventListener('click', function() {
            const expenseId = deleteExpenseButton.getAttribute('data-expense-id');
            fetch(`/delete_expense/${expenseId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    delete_photo: true
                })
            }).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    return response.text().then(text => {
                        throw new Error(text || 'Network response was not ok.');
                    });
                }
            }).then(data => {
                if (data.success) {
                    deleteExpenseModal.style.display = 'none';
                    editExpenseModal.style.display = 'none';
                    // 使用返回的 bill_id 进行重定向
                    window.location.href = `/bill/${data.bill_id}/`;
                } else {
                    throw new Error(data.message || 'Failed to delete expense.');
                }
            }).catch(error => {
                console.error('Error:', error);
                alert('An error occurred during the deletion. Please try again.');
                deleteExpenseModal.style.display = 'none';
            });
        });
    }

    if (confirmDeleteNoButton) {
        confirmDeleteNoButton.addEventListener('click', function() {
            deleteExpenseModal.style.display = 'none';
        });
    }
}

function handleCalculateButton() {
    var calculateButton = document.getElementById('calculate-button');
    
    calculateButton.addEventListener('click', function () {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', window.location.href + 'calculate_debts/', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    var debtsResultDiv = document.getElementById('debts-result');
                    debtsResultDiv.innerHTML = '';
                    
                    response.messages.forEach(function(message) {
                        var messageDiv = document.createElement('div');
                        messageDiv.className = message.tags;
                        messageDiv.textContent = message.message;
                        debtsResultDiv.appendChild(messageDiv);
                    });
                    
                    debtsResultDiv.style.display = 'block';
                    
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            } else {
                console.error('An error occurred during the calculation:', xhr.responseText);
            }
        };
        xhr.send();
    });
}

function handleDeleteBillButton() {
    const deleteBillButton = document.getElementById('delete-bill-button');
    const deleteBillModal = document.getElementById('delete-bill-modal');
    const confirmDeleteYesButton = document.getElementById('confirm-delete-bill-yes');
    const confirmDeleteNoButton = document.getElementById('confirm-delete-bill-no');
    const deleteBillForm = document.getElementById('delete-bill-form');

    if (deleteBillButton) {
        deleteBillButton.addEventListener('click', function(event) {
            event.preventDefault();
            deleteBillModal.style.display = 'block';
        });
    }

    if (confirmDeleteYesButton) {
        confirmDeleteYesButton.addEventListener('click', function(event) {
            event.preventDefault();
            if (deleteBillForm) {
                deleteBillForm.submit();
            } else {
                console.error('Delete bill form not found');
            }
        });
    }

    if (confirmDeleteNoButton) {
        confirmDeleteNoButton.addEventListener('click', function() {
            deleteBillModal.style.display = 'none';
        });
    }

    const closeModalButtons = document.querySelectorAll('.close-button');
    closeModalButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            deleteBillModal.style.display = 'none';
        });
    });
}

let currentFriendId = null;

function loadFriendAvatars() {
    const avatarImgs = document.querySelectorAll('.avatar-img');
    
    avatarImgs.forEach(img => {
        const friendId = img.getAttribute('data-friend-id');
        if (friendId) {
            fetchFriendData(friendId, (data) => {
                if (data && data.profile_photo) {
                    img.src = data.profile_photo;
                }
            });
        }
    });
}

function fetchFriendData(friendId, callback) {
    const url = `/get_friend_profile/${friendId}/`;
    fetch(url)
        .then(response => response.json())
        .then(data => callback(data))
        .catch(error => console.error('Error fetching friend data:', error));
}

function handleFriendProfileModal() {
    const friendProfileModal = document.getElementById('friend-profile-modal');
    const friendCloseButton = friendProfileModal.querySelector('.close-button');
    const friendLinks = document.querySelectorAll('.friend-link');
    console.log("Number of friend links found:", friendLinks.length);

    friendLinks.forEach((link, index) => {
        console.log(`Adding event listener to friend link ${index}`);
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const friendId = this.getAttribute('data-friend-id');
            console.log(`Clicked on friend with ID: ${friendId}`);

            const url = `/get_friend_profile/${friendId}/`;

            fetch(url)
                .then(response => {
                    console.log('Response status:', response.status);
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Friend profile data:', data);
                    currentFriendId = friendId;
                    updateFriendProfileModal(data);
                    friendProfileModal.style.display = 'flex';
                })
                .catch(error => {
                    console.error('Error fetching friend profile:', error);
                    alert('Failed to load friend profile. Please try again.');
                });
        });
    });

    if (friendCloseButton) {
        friendCloseButton.addEventListener('click', function() {
            friendProfileModal.style.display = 'none';
            currentFriendId = null;
        });
    } else {
        console.error("Close button for friend profile modal not found");
    }

    window.addEventListener('click', function(event) {
        if (event.target === friendProfileModal) {
            friendProfileModal.style.display = 'none';
            currentFriendId = null;
        }
    });
}

function updateFriendProfileModal(data) {
    const photoElement = document.getElementById('friend-profile-photo');
    if (photoElement) photoElement.src = data.profile_photo || '';

    const usernameElement = document.getElementById('friend-username');
    if (usernameElement) usernameElement.textContent = data.username || 'N/A';

    const emailElement = document.getElementById('friend-email');
    if (emailElement) emailElement.textContent = data.email || 'N/A';

    const bankAccountElement = document.getElementById('friend-bank-account');
    if (bankAccountElement) bankAccountElement.textContent = data.bank_account_number || 'N/A';

    const qrCodeElement = document.getElementById('friend-bank-qr-code');
    if (qrCodeElement) qrCodeElement.src = data.bank_qr_code || '';
}


function handleRemoveFriendButton() {
    const removeFriendButtonModal = document.getElementById('remove-friend-button-modal');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const confirmDeleteYesButton = document.getElementById('confirm-delete-yes');
    const confirmDeleteNoButton = document.getElementById('confirm-delete-no');


    if (removeFriendButtonModal) {
        removeFriendButtonModal.addEventListener('click', function(event) {
            event.preventDefault();
            confirmDeleteModal.style.display = 'block';
        });
    }

    if (confirmDeleteYesButton) {
        confirmDeleteYesButton.addEventListener('click', function() {
            fetch(`/remove_friend/${currentFriendId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                },
            })
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                location.reload();
            })
            .catch(error => {
                console.error('Error removing friend:', error);
            });
        });
    }

    if (confirmDeleteNoButton) {
        confirmDeleteNoButton.addEventListener('click', function() {
            confirmDeleteModal.style.display = 'none';
        });
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

