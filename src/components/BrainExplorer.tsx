import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const BrainExplorer = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const loadingOverlayRef = useRef<HTMLDivElement>(null);
  const infoTitleRef = useRef<HTMLDivElement>(null);
  const infoSubtitleRef = useRef<HTMLDivElement>(null);
  const infoBodyRef = useRef<HTMLDivElement>(null);
  const infoTagsRef = useRef<HTMLDivElement>(null);
  const infoStatusRef = useRef<HTMLDivElement>(null);
  const btnResetRef = useRef<HTMLButtonElement>(null);
  const btnToggleAnnotationsRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!rootRef.current || !canvasContainerRef.current) return;

    // --- DOM Elements ---
    const root = rootRef.current;
    const canvasContainer = canvasContainerRef.current;
    const loadingOverlay = loadingOverlayRef.current;
    const infoTitle = infoTitleRef.current;
    const infoSubtitle = infoSubtitleRef.current;
    const infoBody = infoBodyRef.current;
    const infoTags = infoTagsRef.current;
    const infoStatus = infoStatusRef.current;
    const btnReset = btnResetRef.current;
    const btnToggleAnnotations = btnToggleAnnotationsRef.current;

    // --- Scene Setup ---
    const scene = new THREE.Scene();

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

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
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
    controls.enableZoom = false;

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
    let brainRoot: THREE.Group | null = null;
    const regionMeshes: { [key: string]: THREE.Mesh } = {};
    let currentRegionName: string | null = null;
    let annotationsVisible = true;
    let userHasInteracted = false;
    let dragStartX = 0;
    let dragStartY = 0;
    const dragThreshold = 5;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // --- Analytics ---
    (window as any).dataLayer = (window as any).dataLayer || [];

    function track(eventName: string, payload: any = {}) {
      (window as any).dataLayer.push({
        event: eventName,
        timestamp: Date.now(),
        ...payload,
      });
    }

    // --- Load Brain Model ---
    const loader = new GLTFLoader();
    const loadStartTime = performance.now();
    const modelPath = "brain-illuminated.glb";

    loader.load(
      modelPath,
      (gltf) => {
        brainRoot = gltf.scene;

        // Debug: log all mesh names
        // brainRoot.traverse((obj) => {
        //   if (obj.isMesh) {
        //     console.log("[brain] mesh name:", obj.name);
        //   }
        // });

        // Process all meshes
        brainRoot.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            // Clone and enhance material
            obj.material = (obj.material as THREE.Material).clone();
            (obj.material as any).transparent = false;
            (obj.material as any).depthWrite = true;
            (obj.material as any).depthTest = true;
            (obj.material as any).roughness = 0.4;
            (obj.material as any).metalness = 0.1;
            (obj.material as any).envMapIntensity = 0.5;
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
              (obj as any).userData.baseColor = (
                obj.material as THREE.MeshStandardMaterial
              ).color.clone();
              (obj as any).userData.highlighted = false;
              (obj as any).userData.regionKey = regionKey;
            } else {
              // Store base color for all meshes
              (obj as any).userData.baseColor = (
                obj.material as THREE.MeshStandardMaterial
              ).color.clone();
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
        if (loadingOverlay) {
          loadingOverlay.style.opacity = "0";
          setTimeout(() => {
            if (loadingOverlay) loadingOverlay.style.display = "none";
          }, 500);
        }

        // Update UI
        if (infoTitle) infoTitle.textContent = "Interactive Brain Explorer";
        if (infoSubtitle) infoSubtitle.textContent = "Brain Explorer";
        if (infoBody)
          infoBody.textContent =
            "Click on different regions of the brain to explore their functions. Drag to rotate, scroll to zoom.";
        if (infoTags) infoTags.textContent = "NO REGION SELECTED";
        if (infoStatus) infoStatus.textContent = "Ready";

        track("brain_model_loaded", { loadTimeMs: Math.round(loadTime) });
      },
      (progress) => {
        if (progress.total > 0 && loadingOverlay) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          const span = loadingOverlay.querySelector("span");
          if (span) span.textContent = `Loading Igor's Brain (${percent}%)`;
        }
      },
      (error) => {
        console.error("Error loading brain model:", error);
        if (loadingOverlay) {
          const span = loadingOverlay.querySelector("span");
          if (span) span.textContent = "Failed to load brain model";
        }
        if (infoStatus) infoStatus.textContent = "Error";
        track("brain_model_load_error", {
          message: (error as any).message || "Unknown error",
        });
      }
    );

    // --- Region Highlighting ---
    function highlightRegion(regionName: string | null) {
      currentRegionName = regionName;

      // Update all meshes
      if (brainRoot) {
        brainRoot.traverse((obj) => {
          if (obj instanceof THREE.Mesh && (obj as any).userData.baseColor) {
            const isActive = (obj as any).userData.regionKey === regionName;
            const base = (obj as any).userData.baseColor;

            if (isActive && annotationsVisible) {
              (obj as any).userData.highlighted = true;
              (obj.material as THREE.MeshStandardMaterial).color = base
                .clone()
                .offsetHSL(0.05, 0.3, 0.15);
              (obj.material as THREE.MeshStandardMaterial).emissive =
                new THREE.Color(0x4a90e2);
              (
                obj.material as THREE.MeshStandardMaterial
              ).emissiveIntensity = 0.8;
            } else if (regionName && !isActive && annotationsVisible) {
              // Dim other regions
              (obj.material as THREE.MeshStandardMaterial).color = base
                .clone()
                .offsetHSL(0, -0.3, -0.2);
              (obj.material as THREE.MeshStandardMaterial).emissive =
                new THREE.Color(0x000000);
              (
                obj.material as THREE.MeshStandardMaterial
              ).emissiveIntensity = 0;
            } else {
              (obj as any).userData.highlighted = false;
              (obj.material as THREE.MeshStandardMaterial).color.copy(base);
              (obj.material as THREE.MeshStandardMaterial).emissive =
                new THREE.Color(0x000000);
              (
                obj.material as THREE.MeshStandardMaterial
              ).emissiveIntensity = 0;
            }
          }
        });
      }

      // Update info panel
      if (
        regionName &&
        REGION_CONFIG[regionName as keyof typeof REGION_CONFIG]
      ) {
        const cfg = REGION_CONFIG[regionName as keyof typeof REGION_CONFIG];
        if (infoTitle) infoTitle.textContent = cfg.displayName;
        if (infoSubtitle) infoSubtitle.textContent = "Brain Explorer · Region";
        if (infoBody) infoBody.textContent = cfg.role;
        if (infoTags) infoTags.textContent = cfg.tags;
        if (infoStatus) infoStatus.textContent = "Region selected";
      } else {
        if (infoTitle) infoTitle.textContent = "Interactive Brain Explorer";
        if (infoSubtitle) infoSubtitle.textContent = "Brain Explorer";
        if (infoBody)
          infoBody.textContent =
            "Click on different regions of the brain to explore their functions. Drag to rotate, scroll to zoom.";
        if (infoTags) infoTags.textContent = "NO REGION SELECTED";
        if (infoStatus) infoStatus.textContent = "Ready";
      }
    }

    function setAnnotationsVisible(visible: boolean) {
      annotationsVisible = visible;

      if (brainRoot) {
        brainRoot.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            if (!visible) {
              (
                obj.material as THREE.MeshStandardMaterial
              ).emissiveIntensity = 0;
              if ((obj as any).userData.baseColor) {
                (obj.material as THREE.MeshStandardMaterial).color.copy(
                  (obj as any).userData.baseColor
                );
              }
            } else if ((obj as any).userData.highlighted && currentRegionName) {
              (
                obj.material as THREE.MeshStandardMaterial
              ).emissiveIntensity = 0.8;
            }
          }
        });
      }

      if (infoStatus)
        infoStatus.textContent = visible
          ? "Annotations visible"
          : "Annotations hidden";
      track("brain_annotations_toggle", { visible });
    }

    // --- Camera Transitions ---
    let activeTween: any = null;

    function tweenCameraTo(
      targetPos: THREE.Vector3,
      targetLookAt: THREE.Vector3,
      duration = 1000
    ) {
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

    function focusRegion(regionName: string) {
      if (!brainRoot || !regionMeshes[regionName]) return;

      controls.autoRotate = false;
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
    function onPointerDown(event: PointerEvent) {
      userHasInteracted = true;
      controls.autoRotate = false;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
    }

    function onPointerUp(event: PointerEvent) {
      if (!brainRoot) return;

      // Check if dragged beyond threshold
      const deltaX = Math.abs(event.clientX - dragStartX);
      const deltaY = Math.abs(event.clientY - dragStartY);
      if (deltaX > dragThreshold || deltaY > dragThreshold) {
        return; // Ignore click if dragged
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.set(x, y);

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(brainRoot, true);

      if (!intersects.length) {
        highlightRegion(null);
        return;
      }

      // Find first hit with a known region
      const hit = intersects.find((i) => {
        const key = (i.object as any).userData.regionKey;
        return key && REGION_CONFIG[key as keyof typeof REGION_CONFIG];
      });

      if (hit) {
        const regionName = (hit.object as any).userData.regionKey;
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
    if (btnReset) btnReset.addEventListener("click", resetView);
    if (btnToggleAnnotations)
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
    (window as any).BrainExplorer = {
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

    // Cleanup
    return () => {
      window.removeEventListener("resize", onWindowResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      if (btnReset) btnReset.removeEventListener("click", resetView);
      if (btnToggleAnnotations)
        btnToggleAnnotations.removeEventListener("click", () =>
          setAnnotationsVisible(!annotationsVisible)
        );
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <section id="hero" className="hero-section">
      <div ref={rootRef} id="brain-root">
        <div ref={canvasContainerRef} id="brain-canvas-container"></div>
        <div ref={loadingOverlayRef} id="brain-loading">
          <span>Loading 3D Brain</span>
        </div>

        <div id="brain-info-panel">
          <div ref={infoSubtitleRef} id="brain-info-subtitle">
            Brain Explorer
          </div>
          <div ref={infoTitleRef} id="brain-info-title">
            Initializing…
          </div>
          <div ref={infoBodyRef} id="brain-info-body">
            Rotate, zoom, and click on different regions of the brain to explore
            their functions.
          </div>
          <div id="brain-info-footer">
            <div ref={infoTagsRef} id="brain-info-tags">
              NO REGION SELECTED
            </div>
            <div ref={infoStatusRef} id="brain-info-status">
              Idle
            </div>
          </div>
        </div>

        <div id="brain-toolbar">
          <button ref={btnResetRef} className="brain-btn" id="btn-reset">
            <span className="icon">⟳</span>
            <span>Reset view</span>
          </button>
          <button
            ref={btnToggleAnnotationsRef}
            className="brain-btn"
            id="btn-toggle-annotations"
          >
            <span className="icon">◎</span>
            <span>Toggle highlight</span>
          </button>
        </div>

        <div id="brain-hint">Drag to rotate · Click regions to explore</div>
      </div>

      {/* <div className="hero-overlay">
        <div className="hero-content">
          <span className="hero-greeting">Hello, I'm</span>
          <h1 className="hero-title">Igor Bjelica</h1>
          <p className="hero-subtitle">Web Developer & Creative Technologist</p>
          <div className="hero-cta">
            <a href="#about" className="btn btn-primary">View My Work</a>
            <a href="#contact" className="btn btn-secondary">Get In Touch</a>
          </div>
        </div>
        <a href="#about" className="scroll-indicator" aria-label="Scroll to content">
          <span className="scroll-arrow"></span>
        </a>
      </div> */}
    </section>
  );
};

export default BrainExplorer;
