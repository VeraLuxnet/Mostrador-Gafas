// Variables globales
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let glassesModel;
let scene, camera, renderer;

// 1. Configurar Three.js
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(canvas.width, canvas.height);
    document.querySelector('.container').appendChild(renderer.domElement);
}

// 2. Cargar modelo 3D de gafas
function loadGlasses() {
    const loader = new THREE.GLTFLoader();
    loader.load(
        'modelo-gafas.glb',
        function (gltf) {
            glassesModel = gltf.scene;
            glassesModel.scale.set(0.5, 0.5, 0.5); // Ajustar escala
            scene.add(glassesModel);
            console.log("Gafas cargadas correctamente");
        },
        undefined,
        function (error) {
            console.error("Error al cargar el modelo:", error);
        }
    );
}

// 3. Iniciar cámara y detección facial
document.getElementById('startBtn').addEventListener('click', async () => {
    // Solicitar acceso a la cámara
    video.srcObject = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
    });

    // Inicializar Three.js
    initThreeJS();
    loadGlasses();

    // Configurar MediaPipe Face Mesh
    const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    faceMesh.setOptions({
        maxNumFaces: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    // Detectar rostros en tiempo real
    faceMesh.onResults((results) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (results.multiFaceLandmarks && glassesModel) {
            // Posicionar gafas en la nariz (punto 1 del landmark)
            const nose = results.multiFaceLandmarks[0][1];
            const x = (nose.x * canvas.width) / 100;
            const y = (nose.y * canvas.height) / 100;
            
            // Convertir coordenadas 2D a 3D
            glassesModel.position.set(
                (x / canvas.width) * 2 - 1,
                -(y / canvas.height) * 2 + 1,
                -0.5
            );
        }
        renderer.render(scene, camera);
    });

    // Procesar cada frame del video
    setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            faceMesh.send({ image: video });
        }
    }, 100);
});
