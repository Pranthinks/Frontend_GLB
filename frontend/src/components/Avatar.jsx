import { useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useControls, button } from "leva";
import { savedExpressions } from "../expressions";

export default function Avatar() {
  const gltf = useLoader(GLTFLoader, "/models/avatar.glb");
  const { scene } = useThree();
  const groupRef = useRef();

  const morphControlRefs = useRef({});
  const morphMeshRefs = useRef({});
  const latestControlsRef = useRef({});
  const bones = useRef({});
  const originalRotations = useRef({});
  const [availableBoneNames, setAvailableBoneNames] = useState([]);
  const [selectedBone, setSelectedBone] = useState("");
  const [poseControlKey, setPoseControlKey] = useState(0);

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
    resetMorphs();
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
      const blob = new Blob([JSON.stringify(changedMorphs, null, 2)], {
        type: "application/json"
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
    Reset_Neutral: button(() => resetMorphs())
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

    const names = [];
    model.traverse((child) => {
      if (child.isBone) {
        bones.current[child.name] = child;
        originalRotations.current[child.name] = child.rotation.clone();
        names.push(child.name);
      }
    });

    setAvailableBoneNames(names);
    setPoseControlKey((prev) => prev + 1);

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

  function PoseControls() {
    useControls("Pose Actions", () => ({
      Bone: {
        options: availableBoneNames.length > 0 ? availableBoneNames : ["No bones found"],
        value: selectedBone,
        onChange: (v) => setSelectedBone(v)
      },
      Rotate_X_Plus: button(() => {
        const bone = bones.current[selectedBone];
        if (bone) bone.rotation.x += Math.PI / 8;
      }),
      Rotate_X_Minus: button(() => {
        const bone = bones.current[selectedBone];
        if (bone) bone.rotation.x -= Math.PI / 8;
      }),
      Rotate_Y_Plus: button(() => {
        const bone = bones.current[selectedBone];
        if (bone) bone.rotation.y += Math.PI / 8;
      }),
      Rotate_Y_Minus: button(() => {
        const bone = bones.current[selectedBone];
        if (bone) bone.rotation.y -= Math.PI / 8;
      }),
      Rotate_Z_Plus: button(() => {
        const bone = bones.current[selectedBone];
        if (bone) bone.rotation.z += Math.PI / 8;
      }),
      Rotate_Z_Minus: button(() => {
        const bone = bones.current[selectedBone];
        if (bone) bone.rotation.z -= Math.PI / 15;
      }),
      Arms_Neutral: button(() => {
        const lShoulder = bones.current["lShldrBend"];
        const rShoulder = bones.current["rShldrBend"];
        const lForearm = bones.current["lForearmBend"];
        const rForearm = bones.current["rForearmBend"];
        if (lShoulder) {
          lShoulder.rotation.z += Math.PI / 4.8;
          lShoulder.rotation.y -= Math.PI / 5;
        }
        if (lForearm) lForearm.rotation.z -= Math.PI / 9;
        if (rShoulder) {
          rShoulder.rotation.z -= Math.PI / 2.8;
          rShoulder.rotation.y += Math.PI / 7;
        }
        if (rForearm) rForearm.rotation.z -= Math.PI / 14;
      }),
      Reset_Pose: button(() => {
        Object.entries(bones.current).forEach(([name, bone]) => {
          const original = originalRotations.current[name];
          if (original) bone.rotation.copy(original);
        });
      }),
      Save_Pose: button(() => {
        const poseData = {};
        Object.entries(bones.current).forEach(([name, bone]) => {
          const { x, y, z } = bone.rotation;
          if (Math.abs(x) > 0.001 || Math.abs(y) > 0.001 || Math.abs(z) > 0.001) {
            poseData[name] = { x, y, z };
          }
        });
        const blob = new Blob([JSON.stringify(poseData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pose.json";
        a.click();
        URL.revokeObjectURL(url);
      }),
      Load_Pose: button(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const text = await file.text();
          const loadedPose = JSON.parse(text);
          Object.entries(loadedPose).forEach(([name, rot]) => {
            const bone = bones.current[name];
            if (bone && rot) bone.rotation.set(rot.x, rot.y, rot.z);
          });
        };
        input.click();
      })
    }));
    return null;
  }

  return <PoseControls key={poseControlKey} />;
}
