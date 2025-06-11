import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Avatar from "./components/Avatar";
import { Leva } from "leva";

function App() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.5, 2.5], fov: 60, near: 0.1, far: 1000 }}
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Lights */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 5, 5]} intensity={0.5} />

      {/* Your Avatar Model */}
      <Avatar />

      {/* Debug box at origin */}
      {/* 
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="red" />
      </mesh>
      */}

      {/* Camera controls with centered focus */}
      <OrbitControls
        enableDamping={true}
        dampingFactor={0.05}
        target={[0, 0, 0]} // center on the avatar's center
      />
    </Canvas>
  );
}

export default App;