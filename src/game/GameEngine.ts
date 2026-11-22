import {
  ArcRotateCamera, Color3, Engine, HemisphericLight, Mesh, MeshBuilder, Ray,
  Scene, StandardMaterial, Vector3, UniversalCamera
} from "@babylonjs/core";
import type { ModeId } from "./types";

export interface GameStats { score: number; shots: number; hits: number; misses: number; combo: number; }
interface Target { mesh: Mesh; born: number; vx: number; vy: number; hp: number; }

export class GameEngine {
  private engine: Engine;
  private scene: Scene;
  private camera: UniversalCamera;
  private targets: Target[] = [];
  private targetMaterial: StandardMaterial;
  private lastSpawn = 0;
  private elapsed = 0;
  private active = false;
  private mode: ModeId = "gridshot";
  private stats: GameStats = { score: 0, shots: 0, hits: 0, misses: 0, combo: 0 };
  private onUpdate: (stats: GameStats, secondsLeft: number) => void;
  private duration = 60;
  private startTime = 0;
  private pointerId: number | null = null;
  private lastX = 0; private lastY = 0;
  private sensitivity = 0.003;

  constructor(private canvas: HTMLCanvasElement, onUpdate: (s: GameStats, t: number) => void) {
    this.onUpdate = onUpdate;
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, adaptToDeviceRatio: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor.set(0.025, 0.04, 0.075, 1);
    this.camera = new UniversalCamera("fps-camera", new Vector3(0, 1.65, -8), this.scene);
    this.camera.minZ = 0.1; this.camera.fov = 1.745; this.camera.rotation.set(0, 0, 0);
    this.camera.inputs.clear();
    new HemisphericLight("arena-light", new Vector3(0, 1, 0), this.scene).intensity = 0.9;
    const floor = MeshBuilder.CreateGround("floor", { width: 24, height: 30 }, this.scene);
    const floorMat = new StandardMaterial("floor-mat", this.scene);
    floorMat.diffuseColor = new Color3(0.055, 0.09, 0.14); floorMat.specularColor = Color3.Black(); floor.material = floorMat;
    const wallMat = new StandardMaterial("wall-mat", this.scene);
    wallMat.diffuseColor = new Color3(0.07, 0.12, 0.19);
    for (const [name, pos, size] of [
      ["back", new Vector3(0, 5, 7), [24, 10, 0.4]],
      ["left", new Vector3(-12, 5, -2), [0.4, 10, 20]],
      ["right", new Vector3(12, 5, -2), [0.4, 10, 20]],
      ["ceiling", new Vector3(0, 10, -2), [24, 0.4, 20]]
    ] as [string, Vector3, number[]][]) {
      const wall = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, this.scene);
      wall.position.copyFrom(pos); wall.material = wallMat; wall.isPickable = false;
    }
    this.targetMaterial = new StandardMaterial("target-mat", this.scene);
    this.targetMaterial.diffuseColor = new Color3(0.12, 0.92, 0.82);
    this.targetMaterial.emissiveColor = new Color3(0.02, 0.3, 0.27);
    this.bindTouch();
    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
      if (this.active) this.update(dt);
      this.scene.render();
    });
    window.addEventListener("resize", this.resize);
  }

  private resize = () => this.engine.resize();
  private bindTouch() {
    this.canvas.addEventListener("pointerdown", e => {
      if (!this.active || e.pointerType === "mouse") return;
      if (e.clientX < window.innerWidth * 0.42) return;
      this.pointerId = e.pointerId; this.lastX = e.clientX; this.lastY = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", e => {
      if (e.pointerId !== this.pointerId || !this.active) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.camera.rotation.y += dx * this.sensitivity;
      this.camera.rotation.x = Math.max(-1.25, Math.min(1.25, this.camera.rotation.x + dy * this.sensitivity));
      this.lastX = e.clientX; this.lastY = e.clientY;
    });
    const end = (e: PointerEvent) => { if (e.pointerId === this.pointerId) this.pointerId = null; };
    this.canvas.addEventListener("pointerup", end); this.canvas.addEventListener("pointercancel", end);
    this.canvas.addEventListener("click", e => {
      if (!this.active || (e as MouseEvent).detail === 0) return;
      this.shoot();
    });
  }
  start(mode: ModeId, duration = 60) {
    this.reset(); this.mode = mode; this.duration = duration; this.elapsed = 0;
    this.startTime = performance.now(); this.active = true;
    if (mode === "gridshot") for (let i=0;i<6;i++) this.spawn();
    else if (mode !== "reaction") this.spawn();
  }
  private reset() {
    this.targets.forEach(t => t.mesh.dispose()); this.targets = [];
    this.stats = { score: 0, shots: 0, hits: 0, misses: 0, combo: 0 };
    this.lastSpawn = 0; this.elapsed = 0;
  }
  private spawn() {
    const size = this.mode === "microshot" ? 0.22 : this.mode === "precision" ? 0.3 : this.mode === "gridshot" ? 0.55 : 0.48;
    const mesh = MeshBuilder.CreateSphere("target", { diameter: size * 2, segments: 16 }, this.scene);
    mesh.position.set((Math.random() - 0.5) * 13, 1.2 + Math.random() * 5.3, 3.5 + Math.random() * 2.5);
    mesh.material = this.targetMaterial; mesh.isPickable = true;
    this.targets.push({ mesh, born: performance.now(), vx: (Math.random()-.5)*2.2, vy: (Math.random()-.5)*1.5, hp: this.mode === "tracking" ? 3 : 1 });
  }
  fire() { if (this.active) this.shoot(); }
  private shoot() {
    this.stats.shots++;
    const ray = this.camera.getForwardRay(100);
    const hit = this.scene.pickWithRay(ray, mesh => mesh.name === "target" && mesh.isEnabled());
    if (hit?.hit && hit.pickedMesh) {
      const target = this.targets.find(t => t.mesh === hit.pickedMesh);
      if (target) {
        this.stats.hits++; this.stats.combo++;
        this.stats.score += Math.round(100 * (this.mode === "precision" ? 1.5 : 1) + Math.min(this.stats.combo, 20) * 5);
        target.hp--;
        if (target.hp <= 0) {
          target.mesh.dispose(); this.targets = this.targets.filter(t => t !== target);
          if (this.mode !== "gridshot") this.spawn();
        }
      }
    } else { this.stats.misses++; this.stats.combo = 0; }
    this.onUpdate(this.stats, Math.max(0, this.duration - this.elapsed));
  }
  private update(dt: number) {
    this.elapsed += dt;
    for (const t of this.targets) {
      if (this.mode === "tracking") {
        t.mesh.position.x += t.vx * dt; t.mesh.position.y += t.vy * dt;
        if (Math.abs(t.mesh.position.x) > 8) t.vx *= -1;
        if (t.mesh.position.y < 1 || t.mesh.position.y > 7) t.vy *= -1;
      }
      if (this.mode === "reaction" && performance.now() - t.born > 850) t.mesh.setEnabled(false);
    }
    const interval = this.mode === "flick" ? 0.8 : this.mode === "reaction" ? 1.7 + Math.random() * 1.5 : 2.2;
    if (this.mode !== "gridshot" && this.targets.length === 0 && this.elapsed - this.lastSpawn > interval) {
      this.spawn(); this.lastSpawn = this.elapsed;
    }
    if (this.mode === "gridshot" && this.targets.length < 6 && this.elapsed - this.lastSpawn > 0.4) {
      this.spawn(); this.lastSpawn = this.elapsed;
    }
    this.onUpdate(this.stats, Math.max(0, this.duration - this.elapsed));
    if (this.elapsed >= this.duration) this.active = false;
  }
  pause(value: boolean) { this.active = !value; }
  setSensitivity(value: number) { this.sensitivity = value; }
  setFov(value: number) { this.camera.fov = value * Math.PI / 180; }
  isFinished() { return this.elapsed >= this.duration; }
  getStats() { return { ...this.stats }; }
  dispose() {
    window.removeEventListener("resize", this.resize);
    this.engine.stopRenderLoop(); this.scene.dispose(); this.engine.dispose();
  }
                  }
