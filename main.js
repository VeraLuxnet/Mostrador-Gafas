// Variables globales
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let model;
let glassesModel;
let scene, camera, renderer;
let currentGlasses = 1;
const glassesModels = [
    'gafas1.glb', // Reemplaza con tus modelos de gafas
    'gafas2.glb',
    'gafas3.glb'
];

// Inicializar la cámara
document.getElementById('startButton').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: 'user' } 
        });
        video.srcObject = stream;
        
        // Cargar el modelo de detección de rostros
        model = await faceLandmarksDetection.load(
            faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
            { maxFaces: 1 }
        );
        
        // Inicializar Three.js para las gafas
        initThreeJS();
        
        // Ocultar mensaje de carga
        document.getElementById('loading').style.display = 'none';
        
        // Iniciar detección
        detectFaces();
    } catch (err) {
        console.error("Error al acceder a la cámara: ", err);
        alert("No se pudo acceder a la cámara. Asegúrate de permitir el acceso.");
    }
});

// Cambiar modelo de gafas
document.getElementById('changeGlasses').addEventListener('click', () => {
    currentGlasses = (currentGlasses + 1) % glassesModels.length;
    loadGlassesModel(glassesModels[currentGlasses]);
});

// Inicializar Three.js
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(canvas.width, canvas.height);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    document.getElementById('camera-container').appendChild(renderer.domElement);
    
    // Cargar el primer modelo de gafas
    loadGlassesModel(glassesModels[0]);
}

// Cargar modelo 3D de gafas
function loadGlassesModel(modelUrl) {
    // Aquí iría el código para cargar tu modelo 3D usando Three.js
    // Esto es un placeholder - necesitarás implementar la carga real según tu modelo
    
    // Eliminar gafas anteriores si existen
    if (glassesModel) {
        scene.remove(glassesModel);
    }
    
    // Simulación de carga de modelo (reemplaza con carga real)
    const geometry = new THREE.BoxGeometry(0.2, 0.1, 0.05);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    glassesModel = new THREE.Mesh(geometry, material);
    scene.add(glassesModel);
    
    console.log(`Modelo de gafas cargado: ${modelUrl}`);
}

// Detectar rostros y colocar gafas
async function detectFaces() {
    const predictions = await model.estimateFaces({
        input: video,
        returnTensors: false,
        flipHorizontal: false,
        predictIrises: true
    });
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (predictions.length > 0) {
        const keypoints = predictions[0].scaledMesh;
        
        // Obtener puntos clave para los ojos y la nariz
        const leftEye = keypoints[33];  // Punto izquierdo del ojo izquierdo
        const rightEye = keypoints[263]; // Punto derecho del ojo derecho
        const nose = keypoints[1];      // Punta de la nariz
        
        // Calcular posición y rotación para las gafas
        if (glassesModel) {
            // Posicionar las gafas entre los ojos
            const eyeCenter = {
                x: (leftEye[0] + rightEye[0]) / 2,
                y: (leftEye[1] + rightEye[1]) / 2,
                z: (leftEye[2] + rightEye[2]) / 2
            };
            
            // Convertir coordenadas de pantalla a coordenadas 3D
            const x = (eyeCenter.x / canvas.width) * 2 - 1;
            const y = -(eyeCenter.y / canvas.height) * 2 + 1;
            const z = -0.5; // Valor ajustable
            
            // Calcular rotación basada en la inclinación de la cabeza
            const dx = rightEye[0] - leftEye[0];
            const dy = rightEye[1] - leftEye[1];
            const angle = Math.atan2(dy, dx);
            
            // Aplicar posición y rotación al modelo 3D
            glassesModel.position.set(x, y, z);
            glassesModel.rotation.z = angle;
            
            // Ajustar tamaño basado en la distancia entre ojos
            const eyeDistance = Math.sqrt(dx*dx + dy*dy);
            const scale = eyeDistance / 100; // Ajustar este valor según necesidad
            glassesModel.scale.set(scale, scale, scale);
        }
    }
    
    // Renderizar escena Three.js
    renderer.render(scene, camera);
    
    // Continuar detección
    requestAnimationFrame(detectFaces);
}