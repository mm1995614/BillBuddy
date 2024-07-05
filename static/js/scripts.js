document.addEventListener("DOMContentLoaded", function() {
    console.log("JavaScript file loaded");

    // 首先隱藏 Crop 按鈕
    var cropButton = document.getElementById('crop-button');
    if (cropButton) {
        cropButton.style.display = 'none';
    }

    // Profile photo handling
    if (document.getElementById('profile-photo')) {
        handleProfilePhoto();
    }

    // QR code handling
    if (document.getElementById('qr-code')) {
        handleQRCodeUpload();
    }

    // Calculate button functionality
    if (document.getElementById('calculate-button')) {
        handleCalculateButton();
    }

    // Split type handling
    if (document.getElementById('split_type')) {
        handleSplitType();
    }

    // Edit expense modal window logic
    if (document.getElementById('edit-expense-modal')) {
        handleEditExpenseModal();
    }

    // Add expense form handling
    if (document.querySelector('#add-expense form')) {
        handleAddExpenseForm();
    }

    // Delete bill button handling
    if (document.getElementById('delete-bill-button')) {
        handleDeleteBillButton();
    }

    // Friend profile modal window logic
    if (document.getElementById('friend-profile-modal')) {
        handleFriendProfileModal();
    }

    // Remove friend button handling
    if (document.querySelectorAll('.remove-friend-button').length) {
        handleRemoveFriendButton();
    }

    function handleProfilePhoto() {
        var profilePhoto = document.getElementById('profile-photo');
        var cropButton = document.getElementById('crop-button');
        var cropper;

        profilePhoto.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (event) {
                var img = document.getElementById('cropper');
                img.src = event.target.result;
                img.style.display = 'block';
                document.getElementById('crop-container').style.display = 'block';
                cropButton.style.display = 'block';

                if (cropper) {
                    cropper.destroy();
                }

                // 創建一個臨時的 Image 對象來獲取圖片的原始尺寸
                var tempImg = new Image();
                tempImg.onload = function() {
                    var maxWidth = 300; // 設置最大寬度
                    var maxHeight = 300; // 設置最大高度
                    var width = tempImg.width;
                    var height = tempImg.height;

                    // 計算縮放比例
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

                    // 設置裁剪區域的大小
                    img.width = width;
                    img.height = height;

                    cropper = new Cropper(img, {
                        aspectRatio: 1,
                        viewMode: 1,
                        autoCropArea: 1,
                        movable: true,
                        zoomable: true,
                        rotatable: true,
                        scalable: true,
                        guides: false,
                        cropBoxResizable: false,
                        dragMode: 'move',
                        ready: function () {
                            // 設置裁剪區域為圓形
                            var cropBoxData = this.cropper.getCropBoxData();
                            var size = Math.min(cropBoxData.width, cropBoxData.height);
                            this.cropper.setCropBoxData({
                                width: size,
                                height: size
                            });
                            
                            // 添加圓形遮罩
                            var cropBox = this.cropper.cropBox;
                            cropBox.style.borderRadius = '50%';
                            cropBox.style.overflow = 'hidden';
                        }
                    });
                };
                tempImg.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        cropButton.addEventListener('click', function () {
            var croppedCanvas = cropper.getCroppedCanvas({
                width: 200,
                height: 200
            });
            var canvas = document.getElementById('profile-image-canvas');
            canvas.width = croppedCanvas.width;
            canvas.height = croppedCanvas.height;
            canvas.getContext('2d').drawImage(croppedCanvas, 0, 0);
            document.getElementById('crop-container').style.display = 'none';
            cropButton.style.display = 'none';

            // 更新頁面上的頭像顯示
            var profilePicture = document.querySelector('.profile-picture');
            if (profilePicture) {
                profilePicture.src = croppedCanvas.toDataURL('image/jpeg');
            } else {
                // 如果之前沒有頭像，創建一個新的
                var container = document.createElement('div');
                container.className = 'profile-picture-container';
                var img = document.createElement('img');
                img.className = 'profile-picture';
                img.src = croppedCanvas.toDataURL('image/jpeg');
                img.alt = 'Profile Picture';
                container.appendChild(img);
                document.querySelector('form').insertBefore(container, document.querySelector('form').firstChild);
            }

            croppedCanvas.toBlob(function (blob) {
                var formData = new FormData();
                formData.append('csrfmiddlewaretoken', document.querySelector('input[name="csrfmiddlewaretoken"]').value);
                formData.append('name', document.getElementById('name').value);
                formData.append('email', document.getElementById('email').value);
                formData.append('profile_picture', blob, 'profile.jpg');
                formData.append('bank_account', document.getElementById('bank-account').value);
                formData.append('bank_qr_code', document.getElementById('qr-code').files[0]);

                var xhr = new XMLHttpRequest();
                xhr.open('POST', document.getElementById('profile-form').action, true);
                xhr.onload = function () {
                    if (xhr.status === 200) {
                        location.reload();
                    } else {
                        console.error('An error occurred during the submission:', xhr.responseText);
                    }
                };
                xhr.send(formData);
            }, 'image/jpeg');
        });
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

    function handleCalculateButton() {
        var calculateButton = document.getElementById('calculate-button');
        calculateButton.addEventListener('click', function () {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', window.location.href + 'calculate_debts/', true);
            xhr.onload = function () {
                if (xhr.status === 200) {
                    document.getElementById('debts-result').innerHTML = xhr.responseText;
                } else {
                    console.error('An error occurred during the calculation:', xhr.responseText);
                }
            };
            xhr.send();
        });
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

    function handleEditExpenseModal() {
        const modal = document.getElementById('edit-expense-modal');
        const closeButton = document.querySelector('.close-button');
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
                // Clear participant checkboxes and amount inputs
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
            // 重置所有複選框和輸入框
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

                        // Clear old participant data
                        const checkboxes = document.querySelectorAll('#edit-participants input[type="checkbox"]');
                        checkboxes.forEach(checkbox => {
                            checkbox.checked = false;
                            const input = document.getElementById(`edit_participant_amount_${checkbox.value}`);
                            if (input) {
                                input.style.display = 'none';
                                input.value = '';
                            }
                        });

                        // Set new participant data
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

        deleteButton.addEventListener('click', function() {
            const expenseId = this.getAttribute('data-expense-id');
            fetch(`/delete_expense/${expenseId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('input[name="csrfmiddlewaretoken"]').value
                }
            }).then(response => {
                if (response.ok) {
                    modal.style.display = 'none';
                    location.reload();
                } else {
                    editErrorMessage.textContent = 'An error occurred during the deletion.';
                    console.error('An error occurred during the deletion:', response.statusText);
                }
            });
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
                // Clear participant checkboxes and amount inputs
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

        addSplitTypeSelect.addEventListener('change', function() {
            toggleParticipantsSection(this.value, addParticipantsSection);
            
        });

        const addCheckboxes = document.querySelectorAll('#participants input[type="checkbox"]');
        addCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                toggleAmountInput(checkbox);
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

    function handleDeleteBillButton() {
        var deleteBillButton = document.getElementById('delete-bill-button');
        deleteBillButton.addEventListener('click', function() {
            document.getElementById('delete-bill-modal').style.display = 'block';
        });

        var closeModalButtons = document.querySelectorAll('.close-button');
        closeModalButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                document.getElementById('delete-bill-modal').style.display = 'none';
            });
        });
    }

    let currentFriendId = null;

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
            });
        } else {
            console.error("Close button for friend profile modal not found");
        }

        window.addEventListener('click', function(event) {
            if (event.target === friendProfileModal) {
                friendProfileModal.style.display = 'none';
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
                    alert('Friend removed successfully.');
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

    // 計算機按鈕處理邏輯
    var modal = document.getElementById("calculator-modal");
    var btn = document.getElementById("open-calculator-button");
    var span = document.getElementsByClassName("close-button")[0];
    var calcButton = document.getElementById("calculate-button");
    var calcResult = document.getElementById("calc-result");
    var billCurrency = "{{ bill.currency }}";

    btn.onclick = function () {
        modal.style.display = "block";
    }

    span.onclick = function () {
        modal.style.display = "none";
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    calcButton.onclick = function () {
        var amount = document.getElementById("calc-amount").value;
        var currency = document.getElementById("calc-currency").value;
        var fixerApiKey = 'ea18a090880dcf460c4313dbdaf9e848';
        var url = `http://data.fixer.io/api/latest?access_key=${fixerApiKey}&base=${currency}&symbols=${billCurrency}`;
        console.log("API Request URL:", url);
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log("API Response Data:", data);
                if (data.success) {
                    var rate = data.rates[billCurrency];
                    var convertedAmount = amount * rate;
                    calcResult.textContent = `Converted Amount: ${convertedAmount.toFixed(2)} ${billCurrency}`;
                } else {
                    calcResult.textContent = "Error fetching exchange rate.";
                }
            })
            .catch(error => {
                console.error("Error:", error);
                calcResult.textContent = "Error: " + error;
            });
    }
});