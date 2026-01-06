// 3D Visualization Module
const Visualization3D = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    points: [],
    targetFunctionSurface: null,
    hasLights: false,
    normalTolerance: 0.1,
    tessellation: 120,
    
    init() {
        const container = document.getElementById('vis3d-canvas');
        if (!container) {
            console.error('3D canvas container not found');
            return false;
        }
        
        // Ensure container has dimensions
        const containerWidth = container.clientWidth || 400;
        const containerHeight = container.clientHeight || 300;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        
        this.camera = new THREE.PerspectiveCamera(
            75, 
            containerWidth / containerHeight,
            0.1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: container,
            antialias: true
        });
        this.renderer.setSize(containerWidth, containerHeight);
        
        // Add axis helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        
        // Check if OrbitControls is available
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, container);
        } else {
            console.warn('OrbitControls not available, using basic camera positioning');
        }
        
        this.camera.position.set(3, 3, 3);
        if (this.controls) {
            this.controls.update();
        }
        
        const animate = () => {
            requestAnimationFrame(animate);
            if (this.controls) {
                this.controls.update();
            }
            this.renderer.render(this.scene, this.camera);
        };
        animate();
        
        // Add window resize handler
        window.addEventListener('resize', () => {
            this.resize();
        });
        
        return true;
    },
    
    resize() {
        const container = document.getElementById('vis3d-canvas');
        if (!container || !this.renderer || !this.camera) return;
        
        const containerWidth = container.clientWidth || 400;
        const containerHeight = container.clientHeight || 300;
        
        this.camera.aspect = containerWidth / containerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(containerWidth, containerHeight);
    },

    clearPoints() {
        this.points.forEach(p => this.scene.remove(p));
        this.points = [];
    },
    
    clearTargetFunction() {
        if (this.targetFunctionSurface) {
            this.scene.remove(this.targetFunctionSurface);
            this.targetFunctionSurface = null;
        }
    },
    
    visualizeTargetFunction() {
        // Clear any existing target function surface
        this.clearTargetFunction();
        
        // Get the target function from the input
        const targetFunctionInput = document.getElementById('target-function');
        if (!targetFunctionInput) {
            console.error('Target function input not found');
            return;
        }
        
        const functionString = targetFunctionInput.value.trim();
        if (!functionString) {
            console.error('No target function specified');
            return;
        }
        
        // Initialize 3D visualization if not already done
        if (!this.scene) {
            this.init();
        }
        
        try {
            // Create a function from the string
            const targetFunction = new Function('x', 'y', `return ${functionString};`);
            
            const points = [];
            const resolution = this.tessellation;
            const range = 3;
            
            // Generate grid of points for target function
            for (let i = 0; i < resolution; i++) {
                for (let j = 0; j < resolution; j++) {
                    const x = (i / (resolution - 1)) * 2 * range - range;
                    const y = (j / (resolution - 1)) * 2 * range - range;
                    
                    try {
                        const z = targetFunction(x, y);
                        points.push({ x, y, z });
                    } catch (error) {
                        console.warn(`Error evaluating target function at (${x}, ${y}):`, error);
                        points.push({ x, y, z: 0 }); // Default to 0 if evaluation fails
                    }
                }
            }
            
            // Create geometry for target function surface
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const indices = [];
            
            // Create vertices
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                positions.push(point.x, point.z, point.y);
            }
            
            // Create triangles
            for (let i = 0; i < resolution - 1; i++) {
                for (let j = 0; j < resolution - 1; j++) {
                    const a = i * resolution + j;
                    const b = a + 1;
                    const c = (i + 1) * resolution + j;
                    const d = c + 1;
                    indices.push(a, b, c);
                    indices.push(b, d, c);
                }
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            
            // Create material with lower opacity
            const material = new THREE.MeshStandardMaterial({
                color: 0x00ff00, // Green color for target function
                transparent: true,
                opacity: 0.3, // Lower opacity
                side: THREE.DoubleSide,
                metalness: 0.1,
                roughness: 0.8
            });
            
            // Create the surface
            this.targetFunctionSurface = new THREE.Mesh(geometry, material);
            this.scene.add(this.targetFunctionSurface);
            
            console.log('Target function visualization added to 3D plot');
            
        } catch (error) {
            console.error('Error creating target function visualization:', error);
            alert(`Error in target function: ${error.message}`);
        }
    },

    updatePoints(points) {
        this.clearPoints();
        
        const resolution = Math.sqrt(points.length);
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const indices = [];
        
        // Sort points into grid
        const grid = Array(resolution).fill().map(() => Array(resolution));
        let idx = 0;
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                grid[i][j] = points[idx++];
            }
        }
        
        // Create vertices and triangles
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                const {x, y, output} = grid[i][j];
                positions.push(x, output[0], y);
            }
        }
        
        // Create triangles
        for (let i = 0; i < resolution - 1; i++) {
            for (let j = 0; j < resolution - 1; j++) {
                const a = i * resolution + j;
                const b = a + 1;
                const c = (i + 1) * resolution + j;
                const d = c + 1;
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Calculate colors based on face normals
        const normals = geometry.attributes.position.count;
        const colorArray = new Float32Array(normals * 3);
        const normArray = geometry.attributes.normal.array;
        
        const normalColors = new Map();
        let colorIdx = 0;
        
        for (let i = 0; i < normals; i++) {
            const nx = normArray[i * 3];
            const ny = normArray[i * 3 + 1];
            const nz = normArray[i * 3 + 2];
            
            // Round normal components using configurable tolerance
            const key = [
                Math.round(nx / this.normalTolerance) * this.normalTolerance,
                Math.round(ny / this.normalTolerance) * this.normalTolerance,
                Math.round(nz / this.normalTolerance) * this.normalTolerance
            ].join(',');
            
            if (!normalColors.has(key)) {
                const hue = (colorIdx++ * 137.508) % 360; // Golden ratio to spread colors
                const color = new THREE.Color().setHSL(hue/360, 0.7, 0.5);
                normalColors.set(key, color);
            }
            
            const color = normalColors.get(key);
            colorArray[i * 3] = color.r;
            colorArray[i * 3 + 1] = color.g;
            colorArray[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
        
        // Create surface with vertex colors
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            metalness: 0.1,
            roughness: 0.8,
            flatShading: true
        });
        
        const surface = new THREE.Mesh(geometry, material);
        
        // Add enhanced wireframe
        const wireframe = new THREE.EdgesGeometry(geometry, 15); // 15-degree threshold
        const wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 1,
            opacity: 0.2,
            transparent: true
        });
        const wireframeOverlay = new THREE.LineSegments(wireframe, wireframeMaterial);
        
        // Add enhanced lighting
        if (!this.hasLights) {
            const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
            mainLight.position.set(3, 5, 2);
            this.scene.add(mainLight);
            
            const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
            fillLight.position.set(-3, 3, -2);
            this.scene.add(fillLight);
            
            const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
            rimLight.position.set(0, -2, 4);
            this.scene.add(rimLight);
            
            const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
            this.scene.add(ambientLight);
            
            this.hasLights = true;
        }
        
        const group = new THREE.Group();
        group.add(surface);
        group.add(wireframeOverlay);
        
        this.scene.add(group);
        this.points.push(group);
    },

    update() {
        if (!this.scene) {
            this.init();
        }
        
        // Ensure proper canvas sizing
        this.resize();
        
        // Check if network exists and has exactly 2 inputs
        if (!window.net) {
            console.error('No network available for 3D visualization');
            return;
        }
        
        if (window.net.architecture[0] !== 2) {
            console.error('3D visualization requires exactly 2 input neurons, found:', window.net.architecture[0]);
            return;
        }
        
        const points = [];
        const resolution = this.tessellation;
        const range = 3;
        
        try {
            // Generate grid of points
            for (let i = 0; i < resolution; i++) {
                for (let j = 0; j < resolution; j++) {
                    const x = (i / (resolution - 1)) * 2 * range - range;
                    const y = (j / (resolution - 1)) * 2 * range - range;
                    
                    const output = window.net.forward([x, y]);
                    
                    points.push({
                        x: x,
                        y: y,
                        output: output
                    });
                }
            }
            
            this.updatePoints(points);
        } catch (error) {
            console.error('Error generating 3D visualization points:', error);
        }
    },

    updateNormalTolerance(value) {
        const val = parseFloat(value);
        this.normalTolerance = val;
        document.getElementById('normal-tolerance-num').value = val;
        if (document.getElementById('plot-type-switch').classList.contains('active')) {
            this.update();
        }
    },

    updateNormalToleranceNum(value) {
        const val = parseFloat(value);
        this.normalTolerance = val;
        document.getElementById('normal-tolerance-slider').value = val;
        if (document.getElementById('plot-type-switch').classList.contains('active')) {
            this.update();
        }
    },

    updateTessellation(value) {
        const val = parseInt(value);
        this.tessellation = val;
        document.getElementById('tessellation-num').value = val;
        if (document.getElementById('plot-type-switch').classList.contains('active')) {
            this.update();
        }
    },

    updateTessellationNum(value) {
        const val = parseInt(value);
        this.tessellation = val;
        document.getElementById('tessellation-slider').value = val;
        if (document.getElementById('plot-type-switch').classList.contains('active')) {
            this.update();
        }
    }
};

// Global functions for backward compatibility
function update3dVisualization() {
    Visualization3D.update();
}

function updateNormalTolerance(value) {
    Visualization3D.updateNormalTolerance(value);
}

function updateNormalToleranceNum(value) {
    Visualization3D.updateNormalToleranceNum(value);
}

function updateTessellation(value) {
    Visualization3D.updateTessellation(value);
}

function updateTessellationNum(value) {
    Visualization3D.updateTessellationNum(value);
}

function visualizeTargetFunction() {
    Visualization3D.visualizeTargetFunction();
}

function clearTargetFunctionVisualization() {
    Visualization3D.clearTargetFunction();
}
