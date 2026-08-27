import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const BrainExplorer = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const loadingOverlayRef = useRef<HTMLDivElement>(null);
  const infoTitleRef = useRef<HTMLDivElement>(null);
  const infoSubtitleRef = useRef<HTMLDivElement>(null);
  const infoBodyRef = useRef<HTMLDivElement>(null);
  const infoTagsRef = useRef<HTMLDivElement>(null);
  const btnResetRef = useRef<HTMLButtonElement>(null);

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
    const btnReset = btnResetRef.current;

    // --- Scene Setup ---
    const scene = new THREE.Scene();

    // --- Visual tuning ---
    // Every knob for the hero's look lives here so it can be tuned in one place.
    const VISUAL = {
      exposure: 1.1,
      envIntensity: 1.0,
      roughness: 0.35,
      metalness: 0.25,
      bloom: { strength: 0.85, radius: 0.5, threshold: 0.75 },
      baseEmissive: 0x14284d,
      baseEmissiveIntensity: 0.45,
      activeEmissive: 0x4a90e2,
      activeEmissiveIntensity: 1.6,
      dimEmissiveIntensity: 0.12,
      particleCount: 700,
      particleSize: 0.045,
    };

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
    renderer.toneMappingExposure = VISUAL.exposure;
    // Opaque clear colour matching --color-bg-deep. The page background behind
    // the canvas is the same flat colour, so this changes nothing visually but
    // makes the post-processing composite deterministic.
    renderer.setClearColor(0x050509, 1);
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

    // --- Environment Map ---
    // A vertical gradient in the site's own palette, used as the scene
    // environment. Without this, the materials' envMapIntensity does nothing
    // and the brain renders with no specular response at all.
    function createGradientEnvironment() {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0.0, "#8f70ff"); // --color-secondary, overhead
      gradient.addColorStop(0.45, "#4a90e2"); // --color-primary, horizon
      gradient.addColorStop(1.0, "#050509"); // --color-bg-deep, below
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 256);

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envSourceTexture = createGradientEnvironment();
    const envRenderTarget = pmremGenerator.fromEquirectangular(envSourceTexture);
    scene.environment = envRenderTarget.texture;
    envSourceTexture.dispose();
    pmremGenerator.dispose();

    // --- Particles Background ---
    const particleCount = VISUAL.particleCount;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    // Three palette tones so the field reads as depth rather than a flat dust
    // cloud: --color-primary, --color-secondary, --color-accent-cyan.
    const particlePalette = [
      new THREE.Color(0x4a90e2),
      new THREE.Color(0x8f70ff),
      new THREE.Color(0x2de2e6),
    ];

    // Keep particles within a spherical shell so they don't get too close
    const minRadius = 4; // minimum distance from origin (bigger = visually smaller)
    const maxRadius = 7; // maximum distance from origin

    for (let i = 0; i < particleCount; i++) {
      // Random point on a sphere, then scale by random radius in [minRadius, maxRadius]
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = minRadius + Math.random() * (maxRadius - minRadius);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const idx = i * 3;
      particlePositions[idx] = x;
      particlePositions[idx + 1] = y;
      particlePositions[idx + 2] = z;

      const tone = particlePalette[i % particlePalette.length];
      particleColors[idx] = tone.r;
      particleColors[idx + 1] = tone.g;
      particleColors[idx + 2] = tone.b;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(particleColors, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: VISUAL.particleSize,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // --- Brain Region Configuration ---
    const REGION_CONFIG = {
      Frontal_Lobe: {
        displayName: "Frontal Lobe",
        role: "The project manager of my brain - plans code sessions, debugs code and life decisions, and occasionally wonders why the coffee machine broke again.",
        tags: "Planning · Logic · Problem-Solving",
      },
      Parietal_Lobe: {
        displayName: "Parietal Lobe",
        role: "My brain's spatial designer - handles responsive layouts, touch interactions, and that awkward moment when you bump into furniture after coding late.",
        tags: "Spatial · Touch · UX Design",
      },
      Temporal_Lobe: {
        displayName: "Temporal Lobe",
        role: "The storyteller of my mind - remembers all the git commands, understands client requirements, and occasionally mixes up variable names.",
        tags: "Memory · Language · Audio Processing",
      },
      Occipital_Lobe: {
        displayName: "Occipital Lobe",
        role: "My brain's art director - processes beautiful UIs, catches visual bugs, and dreams in CSS gradients.",
        tags: "Vision · Graphics · Visual Design",
      },
      Cerebellum: {
        displayName: "Cerebellum",
        role: "The coordination expert - ensures smooth animations, precise mouse movements, and that perfect typing speed during crunch time. Occasionally plays basketball and trips over cables.",
        tags: "Coordination · Motor Skills · Animation",
      },
      Brain_Stem: {
        displayName: "Brain Stem",
        role: "The reliable sysadmin - keeps my heart pumping through deadlines, maintains breathing during presentations and client meetings, and ensures (almost perfectly) I don't fall asleep at my desk.",
        tags: "Vital Functions · Reliability · Stress Management",
      },
      Limbic_System: {
        displayName: "Limbic System",
        role: "My brain's emotional PM - handles team motivation, remembers why I love coding, and occasionally throws tantrums over merge conflicts.",
        tags: "Emotions · Motivation · Team Dynamics",
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
    let targetSceneY = 0;
    let targetFov = 45;
    let lastInteractionTime = 0;

    let disposed = false;
    let rafId = 0;

    // renderer.dispose() releases the WebGL context but not the GPU memory
    // held by geometries, materials and their textures — those must each be
    // disposed explicitly.
    function disposeMaterial(material: THREE.Material) {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) {
          // The cast is required, not cosmetic: `Object.values` yields
          // `unknown`, and with `strictNullChecks: false` TypeScript does not
          // narrow `unknown` through `instanceof`. The runtime guard above is
          // what makes it safe.
          (value as THREE.Texture).dispose();
        }
      });
      material.dispose();
    }

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
    loader.setMeshoptDecoder(MeshoptDecoder);
    const loadStartTime = performance.now();
    const modelPath = "/brain-illuminated.glb";

    loader.load(
      modelPath,
      (gltf) => {
        // The component may have unmounted while the model was downloading.
        // Nothing has been uploaded to the GPU yet — three uploads lazily on
        // first render — so returning early is enough to let it be collected.
        if (disposed) return;

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
            (obj.material as any).roughness = VISUAL.roughness;
            (obj.material as any).metalness = VISUAL.metalness;
            // Now meaningful: scene.environment is set (see Environment Map).
            (obj.material as any).envMapIntensity = VISUAL.envIntensity;
            // Base glow so the bloom pass has something to catch even when no
            // region is selected.
            //
            // NOTE: these two use `as THREE.MeshStandardMaterial`, NOT `as any`
            // like the lines above them — `emissive` and `emissiveIntensity`
            // are properly typed on MeshStandardMaterial, and
            // `@typescript-eslint/no-explicit-any` is an error in this repo.
            (obj.material as THREE.MeshStandardMaterial).emissive =
              new THREE.Color(VISUAL.baseEmissive);
            (obj.material as THREE.MeshStandardMaterial).emissiveIntensity =
              VISUAL.baseEmissiveIntensity;
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
        const scale = 1.5 / maxDim;

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
        if (infoTitle) infoTitle.textContent = "";
        if (infoSubtitle) infoSubtitle.textContent = "Explore Igor's Brain";
        if (infoBody)
          infoBody.textContent =
            "Click on different regions of the brain to explore Igor's functions.";
        if (infoTags) infoTags.textContent = "NO REGION SELECTED";

        track("brain_model_loaded", { loadTimeMs: Math.round(loadTime) });
      },
      (progress) => {
        if (disposed) return;
        if (progress.total > 0 && loadingOverlay) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          const span = loadingOverlay.querySelector("span");
          if (span) span.textContent = `Loading Igor's Brain (${percent}%)`;
        }
      },
      (error) => {
        if (disposed) return;
        console.error("Error loading brain model:", error);
        if (loadingOverlay) {
          const span = loadingOverlay.querySelector("span");
          if (span) span.textContent = "Failed to load brain model";
        }
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
                new THREE.Color(VISUAL.activeEmissive);
              (
                obj.material as THREE.MeshStandardMaterial
              ).emissiveIntensity = VISUAL.activeEmissiveIntensity;
            } else if (regionName && !isActive && annotationsVisible) {
              // Dim other regions — but keep a trace of the base glow so the
              // unselected brain never goes fully matte.
              (obj.material as THREE.MeshStandardMaterial).color = base
                .clone()
                .offsetHSL(0, -0.3, -0.2);
              (obj.material as THREE.MeshStandardMaterial).emissive =
                new THREE.Color(VISUAL.baseEmissive);
              (
                obj.material as THREE.MeshStandardMaterial
              ).emissiveIntensity = VISUAL.dimEmissiveIntensity;
            } else {
              (obj as any).userData.highlighted = false;
              (obj.material as THREE.MeshStandardMaterial).color.copy(base);
              (obj.material as THREE.MeshStandardMaterial).emissive =
                new THREE.Color(VISUAL.baseEmissive);
              (
                obj.material as THREE.MeshStandardMaterial
              ).emissiveIntensity = VISUAL.baseEmissiveIntensity;
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
        if (infoSubtitle) infoSubtitle.textContent = "Explore Igor's Brain";
        if (infoBody) infoBody.textContent = cfg.role;
        if (infoTags) infoTags.textContent = cfg.tags;
      } else {
        if (infoTitle) infoTitle.textContent = "";
        if (infoSubtitle) infoSubtitle.textContent = "Brain Explorer";
        if (infoBody)
          infoBody.textContent =
            "Click on different regions of the brain to explore Igor's functions.";
        if (infoTags) infoTags.textContent = "NO REGION SELECTED";
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
              ).emissiveIntensity = VISUAL.baseEmissiveIntensity;
              if ((obj as any).userData.baseColor) {
                (obj.material as THREE.MeshStandardMaterial).color.copy(
                  (obj as any).userData.baseColor
                );
              }
            } else if ((obj as any).userData.highlighted && currentRegionName) {
              (
                obj.material as THREE.MeshStandardMaterial
              ).emissiveIntensity = VISUAL.activeEmissiveIntensity;
            }
          }
        });
      }

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
      lastInteractionTime = Date.now();
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

    // --- Post-processing ---
    // RenderPass draws the scene, UnrealBloomPass adds the glow, OutputPass
    // applies tone mapping and the sRGB conversion at the end of the chain.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      VISUAL.bloom.strength,
      VISUAL.bloom.radius,
      VISUAL.bloom.threshold
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // --- Animation Loop ---
    function animate() {
      rafId = requestAnimationFrame(animate);

      // Rotate particles slowly
      particles.rotation.y += 0.0002;
      particles.rotation.x += 0.0001;

      // Smooth scroll animation (only when not interacting)
      if (Date.now() - lastInteractionTime > 1000) {
        scene.position.y += (targetSceneY - scene.position.y) * 0.2;
        camera.fov += (targetFov - camera.fov) * 0.2;
        camera.updateProjectionMatrix();
      }

      controls.update();
      composer.render();
    }
    animate();

    // --- Scroll Handler ---
    function onWindowScroll() {
      const scrollY = window.scrollY;
      // Set target positions for smooth animation
      targetSceneY = -scrollY * 0.014;
      targetFov = 45 + scrollY * 0.1;
    }
    window.addEventListener("scroll", onWindowScroll);

    // --- Resize Handler ---
    function onWindowResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
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
      disposed = true;

      // Stop the render loop before anything it touches is disposed.
      cancelAnimationFrame(rafId);
      if (activeTween) activeTween.cancelled = true;

      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("resize", onWindowResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      if (btnReset) btnReset.removeEventListener("click", resetView);

      // OrbitControls keeps its own pointer/wheel listeners on the canvas.
      controls.dispose();

      // Free GPU memory held by the loaded model.
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const materials = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          materials.forEach(disposeMaterial);
        }
      });

      // The particle system is THREE.Points, not a Mesh, so the traverse
      // above skips it.
      particleGeometry.dispose();
      particleMaterial.dispose();

      scene.clear();

      // Post-processing owns its own render targets.
      composer.dispose();
      bloomPass.dispose();
      if (scene.environment) {
        (scene.environment as THREE.Texture).dispose();
        scene.environment = null;
      }

      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();

      delete (window as any).BrainExplorer;
    };
  }, []);

  return (
    <section id="hero" className="hero-section">
      <h1 className="sr-only">
        Igor Bjelica — Web Developer &amp; Creative Technologist
      </h1>
      <div ref={rootRef} id="brain-root">
        <div ref={canvasContainerRef} id="brain-canvas-container"></div>
        <div ref={loadingOverlayRef} id="brain-loading">
          <span>Loading 3D Brain</span>
        </div>

        <div className="brain-controls-panel">
          <div id="brain-toolbar" style={{ marginBottom: "16px" }}>
            <button ref={btnResetRef} className="brain-btn" id="btn-reset">
              <span className="icon">⟳</span>
              <span>Reset view</span>
            </button>

            <div id="brain-hint">Drag to rotate · Click regions to explore</div>
          </div>

          <div id="brain-info-panel">
            <div ref={infoSubtitleRef} id="brain-info-subtitle">
              Brain Explorer
            </div>
            <div ref={infoTitleRef} id="brain-info-title">
              Initializing…
            </div>
            <div ref={infoBodyRef} id="brain-info-body">
              Rotate, zoom, and click on different regions of the brain to
              explore their functions.
            </div>
            <div id="brain-info-footer">
              <div ref={infoTagsRef} id="brain-info-tags">
                NO REGION SELECTED
              </div>
            </div>
          </div>
        </div>
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
