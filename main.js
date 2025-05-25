// Elementos del DOM
const video = document.getElementById('video');
const loadingElement = document.getElementById('loading');
const cameraStatus = document.getElementById('camera-status');
const modelStatus = document.getElementById('model-status');
const detectionStatus = document.getElementById('detection-status');
const retryBtn = document.getElementById('retry-btn');

// Variables globales
let glassesModel;
let faceMesh;

// 1. Configuración de Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
document.getElementById('container').appendChild(renderer.domElement);

// 2. Cargar el modelo de gafas
function loadGlassesModel() {
    modelStatus.textContent = 'Modelo 3D: Cargando...';
    
    const loader = new THREE.GLTFLoader();
    loader.load(
        'modelo-gafas.glb',
        function(gltf) {
            glassesModel = gltf.scene;
            
            // Ajustes iniciales del modelo
            glassesModel.scale.set(0.15, 0.15, 0.15);
            glassesModel.position.set(0, 0, -0.5);
            glassesModel.rotation.set(0, Math.PI, 0);
            
            scene.add(glassesModel);
            modelStatus.textContent = 'Modelo 3D: Cargado ✓';
            console.log('Modelo de gafas cargado correctamente');
            
            checkAllLoaded();
        },
        function(xhr) {
            // Progreso de carga
            const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
            modelStatus.textContent = `Modelo 3D: Cargando ${percent}%`;
        },
        function(error) {
            console.error('Error al cargar el modelo:', error);
            modelStatus.textContent = 'Modelo 3D: Error ❌';
            showRetryButton();
        }
    );
}

// 3. Iniciar cámara y detección facial
async function startFaceDetection() {
    cameraStatus.textContent = 'Cámara: Solicitando acceso...';
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        });
        
        video.srcObject = stream;
        cameraStatus.textContent = 'Cámara: Activada ✓';
        
        // Configurar Face Mesh
        faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        faceMesh.onResults((results) => {
            if (!detectionStatus.textContent.includes('✓')) {
                detectionStatus.textContent = 'Detección facial: Activa ✓';
                checkAllLoaded();
            }
            
            if (results.multiFaceLandmarks && glassesModel) {
                updateGlassesPosition(results.multiFaceLandmarks[0]);
            }
            
            renderer.render(scene, camera);
        });
        
        // Cargar modelo y comenzar detección
        loadGlassesModel();
        
        // Procesar cada frame
        processVideoFrame();
        
    } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        cameraStatus.textContent = 'Cámara: Error ❌';
        showRetryButton();
    }
}

function updateGlassesPosition(landmarks) {
    // Puntos clave para posicionar las gafas
    const leftEye = landmarks[33];  // Esquina izquierda del ojo izquierdo
    const rightEye = landmarks[263]; // Esquina derecha del ojo derecho
    
    // Calcular posición central entre los ojos
    const centerX = (leftEye.x + rightEye.x) / 2;
    const centerY = (leftEye.y + rightEye.y) / 2;
    
    // Calcular distancia entre ojos para el tamaño
    const eyeDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) + 
        Math.pow(rightEye.y - leftEye.y, 2)
    );
    
    // Convertir coordenadas a espacio 3D
    const x = (centerX * 2) - 1;
    const y = -((centerY * 2) - 1);
    
    // Calcular inclinación de la cabeza
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    
    // Aplicar transformaciones al modelo
    glassesModel.position.set(x, y, -0.5);
    glassesModel.rotation.z = angle;
    
    // Ajustar escala basada en la distancia entre ojos
    const scale = eyeDistance * 2.5;
    glassesModel.scale.set(scale, scale, scale);
}

function processVideoFrame() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        faceMesh.send({ image: video })
            .catch(err => {
                console.error("Error en detección facial:", err);
                detectionStatus.textContent = 'Detección facial: Error ❌';
            });
    }
    requestAnimationFrame(processVideoFrame);
}

function checkAllLoaded() {
    if (cameraStatus.textContent.includes('✓') && 
        modelStatus.textContent.includes('✓') && 
        detectionStatus.textContent.includes('✓')) {
        loadingElement.classList.add('hidden');
    }
}

function showRetryButton() {
    retryBtn.style.display = 'block';
    retryBtn.onclick = () => location.reload();
}

// Eventos
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Iniciar la aplicación
startFaceDetection();
        
 
