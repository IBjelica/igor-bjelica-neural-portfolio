/**
 * Brain Explorer - Interactive 3D Brain Visualization
 * For Igor Bjelica's Portfolio
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

(function () {
  "use strict";

  // --- DOM Elements ---
  const root = document.getElementById("brain-root");
  const canvasContainer = document.getElementById("brain-canvas-container");
  const loadingOverlay = document.getElementById("brain-loading");

  const infoTitle = document.getElementById("brain-info-title");
  const infoSubtitle = document.getElementById("brain-info-subtitle");
  const infoBody = document.getElementById("brain-info-body");
  const infoTags = document.getElementById("brain-info-tags");
  const infoStatus = document.getElementById("brain-info-status");

  const btnReset = document.getElementById("btn-reset");
  const btnToggleAnnotations = document.getElementById(
    "btn-toggle-annotations"
  );

  // --- Scene Setup ---
  const scene = new THREE.Scene();

  // Create gradient background
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#0D0F13"); // Dark blue-gray
  gradient.addColorStop(1, "#2a1b3d"); // Dark purple
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 512);
  scene.background = new THREE.CanvasTexture(canvas);

  // Camera
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.0, 3.5);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  canvasContainer.appendChild(renderer.domElement);

  // Controls (global OrbitControls from THREE namespace)
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 1.5;
  controls.maxDistance = 6.0;
  controls.target.set(0, 0.3, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;
  controls.enablePan = false;

  // --- Lighting ---
  // Ambient
  const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
  scene.add(ambientLight);

  // Hemisphere
  const hemiLight = new THREE.HemisphereLight(0x4a90e2, 0x8f70ff, 0.6);
  scene.add(hemiLight);

  // Key light
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
  keyLight.position.set(3, 5, 2);
  scene.add(keyLight);

  // Fill light
  const fillLight = new THREE.DirectionalLight(0x4a90e2, 0.4);
  fillLight.position.set(-3, 2, -2);
  scene.add(fillLight);

  // Rim light
  const rimLight = new THREE.DirectionalLight(0x8f70ff, 0.3);
  rimLight.position.set(0, -2, -3);
  scene.add(rimLight);

  // --- Particles Background ---
  const particleCount = 200;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 20;
    particlePositions[i + 1] = (Math.random() - 0.5) * 20;
    particlePositions[i + 2] = (Math.random() - 0.5) * 20;
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3)
  );

  const particleMaterial = new THREE.PointsMaterial({
    color: 0x4a90e2,
    size: 0.02,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // --- Brain Region Configuration ---
  const REGION_CONFIG = {
    Frontal_Lobe: {
      displayName: "Frontal Lobe",
      role: "Executive functions, planning, voluntary movement, and problem-solving abilities.",
      tags: "Cognition · Planning · Motor control",
    },
    Parietal_Lobe: {
      displayName: "Parietal Lobe",
      role: "Sensory integration, spatial awareness, and processing touch, temperature, and pain.",
      tags: "Touch · Spatial · Attention",
    },
    Temporal_Lobe: {
      displayName: "Temporal Lobe",
      role: "Hearing, language comprehension, and memory formation.",
      tags: "Auditory · Memory · Language",
    },
    Occipital_Lobe: {
      displayName: "Occipital Lobe",
      role: "Primary visual processing and interpretation of visual information.",
      tags: "Vision · Visual cortex",
    },
    Cerebellum: {
      displayName: "Cerebellum",
      role: "Balance, coordination, fine motor control, and motor learning.",
      tags: "Coordination · Balance",
    },
    Brain_Stem: {
      displayName: "Brain Stem",
      role: "Controls vital functions like breathing, heart rate, and consciousness.",
      tags: "Vital functions · Autonomic",
    },
    Limbic_System: {
      displayName: "Limbic System",
      role: "Emotional processing, behavior, and long-term memory.",
      tags: "Emotions · Memory · Behavior",
    },
  };

  // --- State ---
  let brainRoot = null;
  const regionMeshes = {};
  let currentRegionName = null;
  let annotationsVisible = true;
  let userHasInteracted = false;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // --- Analytics ---
  window.dataLayer = window.dataLayer || [];

  function track(eventName, payload = {}) {
    window.dataLayer.push({
      event: eventName,
      timestamp: Date.now(),
      ...payload,
    });
  }

  // --- Load Brain Model ---
  const loader = new THREE.GLTFLoader();
  const loadStartTime = performance.now();
  const modelPath = "Illuminated_1209010312_texture.glb";

  loader.load(
    modelPath,
    (gltf) => {
      brainRoot = gltf.scene;

      // Process all meshes
      brainRoot.traverse((obj) => {
        if (obj.isMesh) {
          // Clone and enhance material
          obj.material = obj.material.clone();
          obj.material.transparent = false;
          obj.material.depthWrite = true;
          obj.material.depthTest = true;
          obj.material.roughness = 0.4;
          obj.material.metalness = 0.1;
          obj.material.envMapIntensity = 0.5;
          obj.castShadow = false;
          obj.receiveShadow = false;

          // Check if this is a known region
          const regionKey = Object.keys(REGION_CONFIG).find(
            (key) =>
              obj.name.includes(key) ||
              obj.name
                .toLowerCase()
                .includes(key.toLowerCase().replace("_", ""))
          );

          if (regionKey) {
            regionMeshes[regionKey] = obj;
            obj.userData.baseColor = obj.material.color.clone();
            obj.userData.highlighted = false;
            obj.userData.regionKey = regionKey;
          } else {
            // Store base color for all meshes
            obj.userData.baseColor = obj.material.color.clone();
          }
        }
      });

      // Center and scale the model
      const box = new THREE.Box3().setFromObject(brainRoot);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;

      brainRoot.scale.multiplyScalar(scale);
      brainRoot.position.sub(center.multiplyScalar(scale));
      brainRoot.position.y += 0.2;

      scene.add(brainRoot);

      // Hide loading overlay
      const loadTime = performance.now() - loadStartTime;
      loadingOverlay.style.opacity = "0";
      setTimeout(() => {
        loadingOverlay.style.display = "none";
      }, 500);

      // Update UI
      infoTitle.textContent = "Interactive Brain Explorer";
      infoSubtitle.textContent = "Brain Explorer";
      infoBody.textContent =
        "Click on different regions of the brain to explore their functions. Drag to rotate, scroll to zoom.";
      infoTags.textContent = "NO REGION SELECTED";
      infoStatus.textContent = "Ready";

      track("brain_model_loaded", { loadTimeMs: Math.round(loadTime) });
    },
    (progress) => {
      if (progress.total > 0) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        loadingOverlay.querySelector(
          "span"
        ).textContent = `Loading 3D Brain (${percent}%)`;
      }
    },
    (error) => {
      console.error("Error loading brain model:", error);
      loadingOverlay.querySelector("span").textContent =
        "Failed to load brain model";
      infoStatus.textContent = "Error";
      track("brain_model_load_error", {
        message: error.message || "Unknown error",
      });
    }
  );

  // --- Region Highlighting ---
  function highlightRegion(regionName) {
    currentRegionName = regionName;

    // Update all meshes
    if (brainRoot) {
      brainRoot.traverse((obj) => {
        if (obj.isMesh && obj.userData.baseColor) {
          const isActive = obj.userData.regionKey === regionName;
          const base = obj.userData.baseColor;

          if (isActive && annotationsVisible) {
            obj.userData.highlighted = true;
            obj.material.color = base.clone().offsetHSL(0.05, 0.3, 0.15);
            obj.material.emissive = new THREE.Color(0x4a90e2);
            obj.material.emissiveIntensity = 0.8;
          } else if (regionName && !isActive && annotationsVisible) {
            // Dim other regions
            obj.material.color = base.clone().offsetHSL(0, -0.3, -0.2);
            obj.material.emissive = new THREE.Color(0x000000);
            obj.material.emissiveIntensity = 0;
          } else {
            obj.userData.highlighted = false;
            obj.material.color.copy(base);
            obj.material.emissive = new THREE.Color(0x000000);
            obj.material.emissiveIntensity = 0;
          }
        }
      });
    }

    // Update info panel
    if (regionName && REGION_CONFIG[regionName]) {
      const cfg = REGION_CONFIG[regionName];
      infoTitle.textContent = cfg.displayName;
      infoSubtitle.textContent = "Brain Explorer · Region";
      infoBody.textContent = cfg.role;
      infoTags.textContent = cfg.tags;
      infoStatus.textContent = "Region selected";
    } else {
      infoTitle.textContent = "Interactive Brain Explorer";
      infoSubtitle.textContent = "Brain Explorer";
      infoBody.textContent =
        "Click on different regions of the brain to explore their functions. Drag to rotate, scroll to zoom.";
      infoTags.textContent = "NO REGION SELECTED";
      infoStatus.textContent = "Ready";
    }
  }

  function setAnnotationsVisible(visible) {
    annotationsVisible = visible;

    if (brainRoot) {
      brainRoot.traverse((obj) => {
        if (obj.isMesh) {
          if (!visible) {
            obj.material.emissiveIntensity = 0;
            if (obj.userData.baseColor) {
              obj.material.color.copy(obj.userData.baseColor);
            }
          } else if (obj.userData.highlighted && currentRegionName) {
            obj.material.emissiveIntensity = 0.8;
          }
        }
      });
    }

    infoStatus.textContent = visible
      ? "Annotations visible"
      : "Annotations hidden";
    track("brain_annotations_toggle", { visible });
  }

  // --- Camera Transitions ---
  let activeTween = null;

  function tweenCameraTo(targetPos, targetLookAt, duration = 1000) {
    if (activeTween) activeTween.cancelled = true;

    const start = performance.now();
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const tween = { cancelled: false };
    activeTween = tween;

    function step() {
      if (tween.cancelled) return;

      const now = performance.now();
      const tRaw = (now - start) / duration;
      const t = Math.min(Math.max(tRaw, 0), 1);

      // Ease in-out cubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.lerpVectors(startTarget, targetLookAt, ease);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function focusRegion(regionName) {
    if (!brainRoot || !regionMeshes[regionName]) return;

    const mesh = regionMeshes[regionName];
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const distance = Math.max(size * 2, 2);

    const dir = new THREE.Vector3(0.5, 0.5, 1).normalize();
    const newPos = center.clone().add(dir.multiplyScalar(distance));

    controls.autoRotate = false;
    tweenCameraTo(newPos, center, 900);
    highlightRegion(regionName);

    track("brain_focus_region", { region: regionName });
  }

  function resetView() {
    controls.autoRotate = true;
    const defaultTarget = new THREE.Vector3(0, 0.3, 0);
    const defaultPos = new THREE.Vector3(0, 1.0, 3.5);

    tweenCameraTo(defaultPos, defaultTarget, 900);
    highlightRegion(null);

    track("brain_reset_view");
  }

  // --- Pointer Interaction ---
  function onPointerDown(event) {
    userHasInteracted = true;
    controls.autoRotate = false;
  }

  function onPointerUp(event) {
    if (!brainRoot) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.set(x, y);

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(brainRoot, true);

    if (!intersects.length) return;

    // Find first hit with a known region
    const hit = intersects.find((i) => {
      const key = i.object.userData.regionKey;
      return key && REGION_CONFIG[key];
    });

    if (hit) {
      const regionName = hit.object.userData.regionKey;
      console.log("Clicked region:", regionName, "mesh:", hit.object.name);

      focusRegion(regionName);
      track("brain_region_click", { region: regionName });
    }
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown, {
    passive: true,
  });
  renderer.domElement.addEventListener("pointerup", onPointerUp, {
    passive: true,
  });

  // --- Button Events ---
  btnReset.addEventListener("click", resetView);
  btnToggleAnnotations.addEventListener("click", () => {
    setAnnotationsVisible(!annotationsVisible);
  });

  // --- Animation Loop ---
  function animate() {
    requestAnimationFrame(animate);

    // Rotate particles slowly
    particles.rotation.y += 0.0002;
    particles.rotation.x += 0.0001;

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // --- Resize Handler ---
  function onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onWindowResize);

  // --- Public API ---
  window.BrainExplorer = {
    focusRegion,
    resetView,
    setAnnotationsVisible,
    highlightRegion,
    getCurrentRegion() {
      return currentRegionName;
    },
    listRegions() {
      return Object.keys(REGION_CONFIG);
    },
  };

  track("brain_viewer_init");
})();
