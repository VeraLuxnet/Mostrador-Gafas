// 1. Iniciar cámara automáticamente
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 2. Configurar Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 3. Cargar modelo de gafas
let glassesModel;
const loader = new THREE.GLTFLoader();
loader.load(
    'modelo-gafas.glb',
    (gltf) => {
        glassesModel = gltf.scene;
        glassesModel.scale.set(0.15, 0.15, 0.15); // Ajusta este valor
        scene.add(glassesModel);
    },
    undefined,
    (error) => console.error("Error al cargar las gafas:", error)
);

// 4. Iniciar detección facial
async function startFaceDetection() {
    video.srcObject = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: 'user' } 
    });

    const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    faceMesh.setOptions({ maxNumFaces: 1 });

    faceMesh.onResults((results) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (results.multiFaceLandmarks && glassesModel) {
            const landmarks = results.multiFaceLandmarks[0];
            // Posicionar gafas en la nariz (punto 1)
            const nose = landmarks[1];
            glassesModel.position.set(
                (nose.x * 2) - 1,
                -((nose.y * 2) - 1),
                -0.5
            );
        }
        renderer.render(scene, camera);
    });

    // Procesar cada frame
    setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            faceMesh.send({ image: video });
        }
    }, 50);
}

// ¡Iniciar todo al cargar la página!
window.onload = startFaceDetection;
