class CameraController {
    constructor(videoElement, overlay, videoContainer) {
        this.videoElement = videoElement;
        this.overlay = overlay;
        this.videoContainer = videoContainer;
        this.videoBlur = document.createElement('div');
        this.videoBlur.className = 'video-blur';
        this.videoContainer.appendChild(this.videoBlur);
        this.stream = null;
        this.state = 'initial';
        this.infoHeader = document.getElementById('infoHeader');
        this.infoContext = document.getElementById('infoContext');
        this.cameraButton = document.getElementById('cameraButton');
        this.flashButton = document.getElementById('flash-button');
        this.focusButton = document.getElementById('focus-button');
        this.flashIcon = this.flashButton.querySelector('i');
        this.focusIcon = this.focusButton.querySelector('i');
        this.flashState = false; // Flaşın başlangıç durumu kapalı
        this.notificationBanner = document.getElementById('notificationBanner');

        // Zoom butonları
        this.zoomInButton = document.getElementById('zoom-in');
        this.zoomOutButton = document.getElementById('zoom-out');


        this.initialize();
    }

    initialize() {
        this.updateButtonText();
        this.updateButtonStates(); // Butonları başlangıç durumuna göre ayarla
        this.zoomButtonsDisabled();
        this.cameraButton.addEventListener('click', (e) => this.handleButtonClick(e));
        this.flashButton.addEventListener('click', () => this.toggleFlash());
        this.focusButton.addEventListener('click', () => this.triggerFocus());
        window.addEventListener('resize', () => this.adjustOverlaySize());
        this.videoElement.onloadedmetadata = () => this.adjustOverlaySize();
        this.overlay.style.display = 'none';
    }

    handleButtonClick(e) {
        this.triggerRippleEffect(e); // Ripple efektini tetikle

        if (this.state === 'initial' || this.state === 'stopped') {
            this.startCamera();
        } else if (this.state === 'started') {
            this.stopCamera();
        }
    }

    triggerRippleEffect(e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        const rect = this.cameraButton.getBoundingClientRect();

        ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) + 'px';
        ripple.style.left = (e.clientX - rect.left - ripple.offsetWidth / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - ripple.offsetHeight / 2) + 'px';

        this.cameraButton.appendChild(ripple);

        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    }

    async startCamera() {
        this.overlay.style.display = 'block';
        this.zoomButtonsEnabled();
        try {
            
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.videoElement.srcObject = this.stream;
            this.state = 'started';
            this.updateButtonText();
            this.updateButtonStates(); // Kamera açıldığında butonları aktif hale getir
            this.adjustOverlaySize();
            
        } catch (error) {
            console.error("Kamera başlatılamadı:", error);
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.state = 'stopped';
        this.updateButtonText();
        this.updateButtonStates(); // Kamera durduğunda butonları devre dışı bırak
        this.resetFlashButton(); // Kamera durdurulunca flaş butonunu sıfırla
        this.resetFocusButton(); // Kamera durdurulunca fokus butonunu sıfırla
        this.showNotificationBanner("12345678902");
        this.overlay.style.display = 'none';
        this.zoomButtonsDisabled();
    }

    updateButtonText() {
        if (this.state === 'initial') {
            this.cameraButton.textContent = 'Kamerayı Başlat';
        } else if (this.state === 'started') {
            this.cameraButton.textContent = 'Kamerayı Durdur';
        } else if (this.state === 'stopped') {
            this.cameraButton.textContent = 'Yeni Davetli Ara';
        }
    }

    updateButtonStates() {
        const isEnabled = this.state === 'started';
        this.flashButton.disabled = !isEnabled;
        this.focusButton.disabled = !isEnabled;

        if (isEnabled) {
            this.flashButton.classList.remove('disabled');
            this.focusButton.classList.remove('disabled');
        } else {
            this.flashButton.classList.add('disabled');
            this.focusButton.classList.add('disabled');
        }
    }

    adjustOverlaySize() {
        const videoRect = this.videoElement.getBoundingClientRect();
        const overlayRect = this.overlay.getBoundingClientRect();

        this.videoBlur.style.width = `${videoRect.width}px`;
        this.videoBlur.style.height = `${videoRect.height}px`;

        const clipPathValue = `polygon(
            0% 0%, 
            100% 0%, 
            100% 100%, 
            0% 100%, 
            0% 0%, 
            100% 0%, 
            100% ${((overlayRect.top - videoRect.top) / videoRect.height) * 100}%, 
            ${((overlayRect.left - videoRect.left) / videoRect.width) * 100}% ${((overlayRect.top - videoRect.top) / videoRect.height) * 100}%, 
            ${((overlayRect.left - videoRect.left) / videoRect.width) * 100}% ${((overlayRect.bottom - videoRect.top) / videoRect.height) * 100}%, 
            ${((overlayRect.right - videoRect.left) / videoRect.width) * 100}% ${((overlayRect.bottom - videoRect.top) / videoRect.height) * 100}%, 
            ${((overlayRect.right - videoRect.left) / videoRect.width) * 100}% ${((overlayRect.top - videoRect.top) / videoRect.height) * 100}%
        )`;

        this.videoBlur.style.clipPath = clipPathValue;
    }

    toggleFlash() {
        if (this.flashButton.disabled) return; // Buton devre dışıyken çalışmasın

        this.flashState = !this.flashState; // Flaş durumunu değiştir
        if (this.flashState) {
            this.flashButton.classList.add('active'); // Flaş açıkken buton sarı
        } else {
            this.flashButton.classList.remove('active'); // Flaş kapalıyken eski haline dön
        }

        if (this.stream) {
            const videoTrack = this.stream.getVideoTracks()[0];
            if (videoTrack.getCapabilities().torch) {
                videoTrack.applyConstraints({
                    advanced: [{ torch: this.flashState }]
                }).catch(err => console.error("Flaş durumu değiştirilemedi:", err));
            } else {
                console.warn("Flaş bu cihazda desteklenmiyor.");
            }
        }
    }

    resetFlashButton() {
        this.flashState = false; // Flaş kapalı duruma getir
        this.flashButton.classList.remove('active'); // Flaş kapalıyken eski haline dön
    }

    triggerFocus() {
        if (this.focusButton.disabled) return; // Buton devre dışıyken çalışmasın

        this.focusButton.classList.add('active'); // Focus butonunu aktif hale getir
        setTimeout(() => {
            this.focusButton.classList.remove('active'); // Kısa bir süre sonra eski haline döner
        }, 300); // 300ms sonra geri döner

        // Burada odaklanma işlemini gerçekleştirebilirsin
        console.log("Odaklanma işlemi tetiklendi.");
    }

    resetFocusButton() {
        this.focusButton.classList.remove('active'); // Focus butonunu sıfırla
    }

    showNotificationBanner(text_) {
        console.log('Banner tetiklendi'); // Fonksiyonun çalışıp çalışmadığını kontrol edin
        this.notificationBanner.classList.add('notification-in');
        this.notificationBanner.innerHTML = 'T.C. Kimlik Bulundu!<br>' + text_;
        setTimeout(() => {
            this.notificationBanner.classList.remove('notification-in');
        }, 2000);
    }
    
    zoomButtonsEnabled(){
        this.zoomInButton.classList.remove('disabled');
        this.zoomOutButton.classList.remove('disabled'); 
    }

    zoomButtonsDisabled(){
        this.zoomInButton.classList.add('disabled');
        this.zoomOutButton.classList.add('disabled');
    }
    

}

// HTML elementleri bağlayarak CameraController'ı başlat
document.addEventListener("DOMContentLoaded", () => {
    const videoElement = document.getElementById('camera');
    const overlay = document.getElementById('overlay');
    const videoContainer = document.querySelector('.video-container');

    const cameraController = new CameraController(videoElement, overlay, videoContainer);
});
