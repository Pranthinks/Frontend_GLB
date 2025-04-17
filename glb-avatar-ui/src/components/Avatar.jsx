import { useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useControls, button } from "leva";
import { savedExpressions } from "../expressions"; // adjust if needed

export default function Avatar() {
  const gltf = useLoader(GLTFLoader, "/models/avatar.glb");
  const { scene } = useThree();
  const groupRef = useRef();

  const morphControlRefs = useRef({});
  const morphMeshRefs = useRef({});
  const latestControlsRef = useRef({});

  const controlValues = {};

  gltf.scene.traverse((child) => {
    if ((child.isMesh || child.isSkinnedMesh) && child.morphTargetDictionary) {
      const dict = child.morphTargetDictionary;
      const meshName = child.name || "UnnamedMesh";
      morphControlRefs.current[meshName] = dict;
      morphMeshRefs.current[meshName] = child;

      Object.keys(dict).forEach((key) => {
        const controlKey = `${meshName}.${key}`;
        controlValues[controlKey] = {
          value: 0,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v) => {
            latestControlsRef.current[controlKey] = v;
          }
        };
      });
    }
  });

  const controls = useControls("Morph Targets", controlValues);

  useEffect(() => {
    Object.entries(controls).forEach(([k, v]) => {
      latestControlsRef.current[k] = v;
    });
  }, [controls]);

  function resetMorphs() {
    for (const [meshName, morphs] of Object.entries(morphControlRefs.current)) {
      for (const morphName of Object.keys(morphs)) {
        const controlKey = `${meshName}.${morphName}`;
        if (latestControlsRef.current[controlKey] !== undefined) {
          latestControlsRef.current[controlKey] = 0;
          controls[controlKey] = 0;
        }
      }
    }
  }

  function applyPreset(preset) {
    resetMorphs(); // clear all morphs before applying new one
    for (const [meshName, morphs] of Object.entries(preset)) {
      for (const [morphName, value] of Object.entries(morphs)) {
        const controlKey = `${meshName}.${morphName}`;
        if (latestControlsRef.current[controlKey] !== undefined) {
          latestControlsRef.current[controlKey] = value;
          controls[controlKey] = value;
        }
      }
    }
  }

  // Save / Load / Presets / Reset UI
  useControls("Expression Actions", {
    Save_Expression: button(() => {
      const changedMorphs = {};
      for (const [meshName, morphs] of Object.entries(morphControlRefs.current)) {
        for (const [morphName] of Object.entries(morphs)) {
          const controlKey = `${meshName}.${morphName}`;
          const val = latestControlsRef.current[controlKey];
          if (val && val !== 0) {
            if (!changedMorphs[meshName]) changedMorphs[meshName] = {};
            changedMorphs[meshName][morphName] = val;
          }
        }
      }

      console.log("🎭 Saved Expression:", changedMorphs);

      const blob = new Blob([JSON.stringify(changedMorphs, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expression.json";
      a.click();
      URL.revokeObjectURL(url);
    }),

    Load_Expression: button(() => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const loaded = JSON.parse(text);
        applyPreset(loaded);
      };
      input.click();
    }),

    Thinking: button(() => applyPreset(savedExpressions.thinking)),
    MouthOpen: button(() => applyPreset(savedExpressions.mouth)),
    Oops: button(() => applyPreset(savedExpressions.oops)),
    Reset_Neutral: button(() => resetMorphs()),
  });

  useEffect(() => {
    const model = gltf.scene;
    const wrapper = new THREE.Group();
    wrapper.add(model);

    model.position.set(0, 0, 0);
    model.scale.set(1.5, 1.5, 1.5);
    wrapper.position.set(0, -1.5, 0);

    groupRef.current = wrapper;
    scene.add(wrapper);

    const applyMorphTargets = () => {
      for (const [meshName, morphs] of Object.entries(morphControlRefs.current)) {
        const mesh = morphMeshRefs.current[meshName];
        if (!mesh) continue;

        for (const [morphName, index] of Object.entries(morphs)) {
          const controlKey = `${meshName}.${morphName}`;
          if (latestControlsRef.current[controlKey] !== undefined) {
            mesh.morphTargetInfluences[index] = latestControlsRef.current[controlKey];
          }
        }
      }
    };

    const animate = () => {
      applyMorphTargets();
      requestAnimationFrame(animate);
    };
    animate();
  }, [gltf, scene]);

  return null;
}
