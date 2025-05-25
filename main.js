// Variables globales
const video = document.getElementById('video');
const loadingElement = document.getElementById('loading');
let glassesModel;

// 1. Configuración de Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
document.getElementById('container').appendChild(renderer.domElement);

// 2. Cargar el modelo de gafas
function loadGlassesModel() {
    const loader = new THREE.GLTFLoader();
    loader.load(
        'modelo-gafas.glb',
        function(gltf) {
            glassesModel = gltf.scene;
            
            // Ajustes iniciales del modelo
            glassesModel.scale.set(0.15, 0.15, 0.15);
            glassesModel.position.set(0, 0, -0.5);
            glassesModel.rotation.set(0, Math.PI, 0); // Ajustar orientación
            
            scene.add(glassesModel);
            console.log('Modelo de gafas cargado correctamente');
        },
        undefined,
        function(error) {
            console.error('Error al cargar el modelo:', error);
            loadingElement.textContent = 'Error al cargar las gafas. Recarga la página.';
        }
    );
}

// 3. Iniciar cámara y detección facial
async function startFaceDetection() {
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
        
        // Configurar Face Mesh
        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        faceMesh.onResults((results) => {
            if (results.multiFaceLandmarks && glassesModel) {
                const landmarks = results.multiFaceLandmarks[0];
                
                // Puntos clave para posicionar las gafas
                const leftEye = landmarks[33];  // Esquina izquierda del ojo izquierdo
                const rightEye = landmarks[263]; // Esquina derecha del ojo derecho
                const noseBridge = landmarks[168]; // Puente de la nariz
                
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
            
            renderer.render(scene, camera);
        });
        
        // Cargar modelo y comenzar detección
        loadGlassesModel();
        
        // Procesar cada frame
        const processFrame = async () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                await faceMesh.send({ image: video });
            }
            requestAnimationFrame(processFrame);
        };
        
        processFrame();
        loadingElement.classList.add('hidden');
        
    } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        loadingElement.textContent = "Error: No se pudo acceder a la cámara. Asegúrate de permitir los permisos.";
    }
}

// Ajustar tamaño al cambiar la ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Iniciar todo cuando se cargue la página
window.onload = startFaceDetection;
