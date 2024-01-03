import * as THREE from "three";
import { OrbitControls } from 'https://unpkg.com/three@0.159.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.159.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.159.0/examples/jsm/loaders/DRACOLoader.js';
import 'https://cdn.jsdelivr.net/npm/@theatre/browser-bundles@0.5.0-insiders.88df1ef/dist/core-and-studio.js'
import { FBXLoader } from 'https://unpkg.com/three@0.159.0/examples/jsm/loaders/FBXLoader.js';


// DB
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPEol03OfYhk0I3xHsN6mo5QId1uQGYUY",
  authDomain: "webgame-786ab.firebaseapp.com",
  databaseURL: "https://webgame-786ab.firebaseio.com",
  projectId: "webgame-786ab",
  storageBucket: "webgame-786ab.appspot.com",
  messagingSenderId: "799855043540",
  appId: "1:799855043540:web:c3b6f68c8ff39ffc"
};

// Initialize Firebase
const app = initializeApp( firebaseConfig );
const storage = getStorage();

const filesToDownload = [
    'https://firebasestorage.googleapis.com/v0/b/webgame-786ab.appspot.com/o/codepen%2Fexporting_gif%2Fmash_ex03.gltf?alt=media&token=f2608910-d993-48a6-9516-6fd5424fb0ea',
    'https://firebasestorage.googleapis.com/v0/b/webgame-786ab.appspot.com/o/codepen%2Fexporting_gif%2Fmash_ex03.json?alt=media&token=05b39924-789a-4b81-92db-43912838c9db',
    'https://firebasestorage.googleapis.com/v0/b/webgame-786ab.appspot.com/o/codepen%2Fexporting_gif%2Fmash_ex030.bin?alt=media&token=1ff6eb08-819e-4d34-825d-9dd415e66e44'  
];

const firebase_gltf_blobs = {};


  // Function to download a single file
const downloadFile = ( filePath ) => {

    const fileRef = ref( storage, filePath );

    return getDownloadURL( fileRef )
      .then( (url) => fetch(url) )
      .then( (response) => response.blob() )
      .then( (blob) => ({ filePath, blob }) )
      .catch( (error) => ({ filePath, error }) );

};

// Function to download multiple files
const downloadMultipleFiles = ( filePaths ) => {

    const promises = filePaths.map( (filePath) => downloadFile(filePath) );
    return Promise.all(promises);
  
};


downloadMultipleFiles( filesToDownload )
.then( results => {

    // Handle the results (contains blobs or errors for each file)
    results.forEach( result => {
      if (result.error) {
        console.error(`Error downloading ${result.filePath}:`, result.error);
      } else {
        let fileName = result.filePath.split('?').shift().split('%2F').pop();
        firebase_gltf_blobs[ fileName ] = result.blob;
        // console.log(`File ${result.filePath} downloaded successfully!`);
        // Handle the blob (e.g., display or save it)
        // console.log('Blob:', result.blob);
      }
    });

    // console.log('firebase_gltf_blobs: ', firebase_gltf_blobs );
    init();
    animate();


}).catch((error) => {
    console.error('Error downloading files:', error);  
});


let mixer, action, orbitControls, renderer, scene, camera;

// We can now access Theatre.core and Theatre.studio from here
const { core, studio } = Theatre;
studio.initialize() // Start the Theatre.js UI

let capturer;
const canvas = document.querySelector('.draw');
const clock = new THREE.Clock();
const modelArray = [];

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
const fbxLoader = new FBXLoader();
dracoLoader.setDecoderPath("https://unpkg.com/three@0.159.0/examples/jsm/libs/draco/");
gltfLoader.setDRACOLoader( dracoLoader );


function init() {

    // Scene
    scene = new THREE.Scene();

    // Resizing
    window.addEventListener( 'resize', () => {

        // Update Size
        aspect.width = canvas.width;
        aspect.height = canvas.height;

        // New Aspect Ratio
        camera.aspect = aspect.width / aspect.height;
        camera.updateProjectionMatrix();

        // New RendererSize
        renderer.setSize( aspect.width, aspect.height );
        renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ))

    });

    const aspect = {
        width: canvas.width,
        height: canvas.height,
    }

    camera = new THREE.PerspectiveCamera( 30, aspect.width/aspect.height, .01, 1000 );
    camera.position.z = 10;
    scene.add( camera );


    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        canvas: canvas,
        alpha: true,
        preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio( window.devicePixelRatio );
    // renderer.setClearColor( "#27282c", 1.0 );
    renderer.setSize( aspect.width, aspect.height );


    // Loading
    let directLight = new THREE.DirectionalLight( 0xffffff, 1.2 );
    directLight.position.set( 2, 4, 5 );
    scene.add( directLight );


    // Object Loading
// *********************************
// *** 클라우드 서버에서 gltf 로딩 ***
// *********************************
    const loadingManager = new THREE.LoadingManager();
    console.log( firebase_gltf_blobs );
    const objectURLs = [];

    loadingManager.setURLModifier( (url) => {

        if (url.endsWith('.bin')) {
            // Specify the path for the binary file
            return 'https://firebasestorage.googleapis.com/v0/b/webgame-786ab.appspot.com/o/codepen%2Fexporting_gif%2Fmash_ex030.bin?alt=media&token=1ff6eb08-819e-4d34-825d-9dd415e66e44';
        } else if (url.endsWith('.json')) {
            // Specify the path for the JSON file
            return 'https://firebasestorage.googleapis.com/v0/b/webgame-786ab.appspot.com/o/codepen%2Fexporting_gif%2Fmash_ex03.json?alt=media&token=05b39924-789a-4b81-92db-43912838c9db';
        } else {
            return url;
        }
        
    });

    const gltfFileLoader = new GLTFLoader( loadingManager );
    gltfFileLoader.load( 'https://firebasestorage.googleapis.com/v0/b/webgame-786ab.appspot.com/o/codepen%2Fexporting_gif%2Fmash_ex03.gltf?alt=media&token=f2608910-d993-48a6-9516-6fd5424fb0ea', async (gltf) => {

        const model = gltf.scene;

        await renderer.compileAsync( model, camera, scene );

        mixer = new THREE.AnimationMixer( model );
        console.log('gltf animations: ', gltf.animations );

        // // action = mixer.clipAction( gltf.animations[0] );
        const trimmedAction = THREE.AnimationUtils.subclip( gltf.animations[0], 'clip', 1, 100);
        mixer.clipAction(trimmedAction).play();
    
        scene.add( model );

        // GUI 제작하기 (Theatre.js)
        const project = core.getProject('MOgL 3D Animating');
        const sheet = project.sheet('Sheet 1');

        const rotationBoxes = sheet.object( 'moving boxes', {
            rotation: core.types.compound({
                x: core.types.number( model.rotation.x, { range: [-2, 2]} ),
                y: core.types.number( model.rotation.y, { range: [-2, 2]} ),
                z: core.types.number( model.rotation.z, { range: [-2, 2]} ),
            }),
        });

        rotationBoxes.onValuesChange( (values) => {
            const { x, y, z } = values.rotation;
            model.rotation.set( x * Math.PI, y * Math.PI, z * Math.PI )
        });
        

    })


// **********************************
// *** 로컬 서버 운영 시, gltf 로딩 ***
// **********************************

    // const loader = new GLTFLoader().setPath( './src/models/mash/' );

    // loader.load( 'mash_ex03.gltf', async function ( gltf ) {

    // 	const model = gltf.scene;

    //     console.log('gltf model: ', model );
    //     await renderer.compileAsync( model, camera, scene );

    //     mixer = new THREE.AnimationMixer( model );
    //     console.log('gltf animations: ', gltf.animations );

    //     // // action = mixer.clipAction( gltf.animations[0] );
    //     const trimmedAction = THREE.AnimationUtils.subclip( gltf.animations[0], 'clip', 1, 100);
    //     mixer.clipAction(trimmedAction).play();
    
    //     scene.add( model );

    //     // GUI 제작하기 (Theatre.js)
    //     const project = core.getProject('MOgL 3D Animating');
    //     const sheet = project.sheet('Sheet 1');

    //     const rotationBoxes = sheet.object( 'moving boxes', {
    //         rotation: core.types.compound({
    //             x: core.types.number( model.rotation.x, { range: [-2, 2]} ),
    //             y: core.types.number( model.rotation.y, { range: [-2, 2]} ),
    //             z: core.types.number( model.rotation.z, { range: [-2, 2]} ),
    //         }),
    //     });

    //     rotationBoxes.onValuesChange( (values) => {
    //         const { x, y, z } = values.rotation;
    //         model.rotation.set( x * Math.PI, y * Math.PI, z * Math.PI )
    //     });
    
    // });


    // Controls
    orbitControls = new OrbitControls( camera, canvas );
    orbitControls.enableDamping = true;

}


// Animating
const animate = () => {

    requestAnimationFrame( animate );

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if( orbitControls ) orbitControls.update();

    if ( mixer ) mixer.update( delta );

    renderer.render( scene, camera );
    if( capturer ) capturer.capture( canvas);


}


// Func
document.querySelector('#capture-start').addEventListener('click', (e) => {

    capturer = new CCapture({
        format: 'gif', 
        workersPath: 'js/lib/',
        display: true,
    });
    capturer.start();
    e.preventDefault();
}, false );

document.querySelector('#capture-stop').addEventListener('click', () => {
    capturer.stop();
    capturer.save();
    
}, false );
