// Decision Boundary and Plot Management Module
const DecisionBoundary = {
    plotCanvas: null,
    plotCtx: null,
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#AED6F1', '#A9DFBF', '#F9E79F'],
    currentPoint: null,
    highlightedNeuron: null, // Track which neuron is being highlighted (legacy - will be replaced)
    highlightedNeurons: new Set(), // Track multiple highlighted neurons
    originalRegions: null, // Store original region data for restoration
    
    // Panning state
    panOffset: { x: 0, y: 0 }, // Current pan offset
    viewBounds: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 }, // Current view bounds
    isDragging: false,
    lastMousePos: { x: 0, y: 0 },
    
    // Zooming state
    zoomLevel: 1.0, // Current zoom level
    minZoom: 0.1,   // Minimum zoom (zoom out limit)
    maxZoom: 10.0,  // Maximum zoom (zoom in limit)

    init() {
        this.plotCanvas = document.getElementById('plot-canvas');
        if (!this.plotCanvas) {
            console.error('Plot canvas element with id "plot-canvas" not found');
            return false;
        }
        this.plotCtx = this.plotCanvas.getContext('2d');
        this.setupEventListeners();
        this.createNeuronButtons(); // Initialize neuron buttons
        this.updateZoomDisplay(); // Initialize zoom display
        return true;
    },

    setupEventListeners() {
        // Click to set current point (only when not dragging)
        this.plotCanvas.addEventListener('click', e => {
            if (!window.net || window.net.architecture[0] !== 2 || this.isDragging) return;
            const rect = this.plotCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / 300;
            const y = (e.clientY - rect.top) / 300;
            
            // Convert to real coordinates using current view bounds
            const xVal = this.viewBounds.xMin + x * (this.viewBounds.xMax - this.viewBounds.xMin);
            const yVal = this.viewBounds.yMax - y * (this.viewBounds.yMax - this.viewBounds.yMin); // Flip Y coordinate
            
            this.currentPoint = { x: xVal, y: yVal };
            document.getElementById('input-0').value = xVal.toFixed(2);
            document.getElementById('input-1').value = yVal.toFixed(2);
            forward();
        });

        // Mouse down - start potential drag
        this.plotCanvas.addEventListener('mousedown', e => {
            if (!window.net || window.net.architecture[0] !== 2) return;
            this.isDragging = false; // Will be set to true on first mouse move
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.plotCanvas.style.cursor = 'grabbing';
            e.preventDefault();
        });

        // Mouse move - handle dragging
        this.plotCanvas.addEventListener('mousemove', e => {
            if (!window.net || window.net.architecture[0] !== 2) return;
            
            const rect = this.plotCanvas.getBoundingClientRect();
            
            // Check if mouse is down (we're in a potential drag)
            if (e.buttons === 1) {
                this.isDragging = true;
                
                const deltaX = e.clientX - this.lastMousePos.x;
                const deltaY = e.clientY - this.lastMousePos.y;
                
                // Convert pixel delta to real coordinate delta
                const viewWidth = this.viewBounds.xMax - this.viewBounds.xMin;
                const viewHeight = this.viewBounds.yMax - this.viewBounds.yMin;
                const realDeltaX = -(deltaX / 300) * viewWidth; // Negative for natural panning
                const realDeltaY = (deltaY / 300) * viewHeight; // Positive because Y is flipped
                
                // Update view bounds
                this.viewBounds.xMin += realDeltaX;
                this.viewBounds.xMax += realDeltaX;
                this.viewBounds.yMin += realDeltaY;
                this.viewBounds.yMax += realDeltaY;
                
                this.lastMousePos = { x: e.clientX, y: e.clientY };
                this.update(); // Redraw with new bounds
            } else {
                this.plotCanvas.style.cursor = 'grab';
            }
        });

        // Mouse up - end drag
        this.plotCanvas.addEventListener('mouseup', e => {
            setTimeout(() => { this.isDragging = false; }, 10); // Small delay to prevent click after drag
            this.plotCanvas.style.cursor = 'grab';
        });

        // Mouse leave - end drag
        this.plotCanvas.addEventListener('mouseleave', e => {
            setTimeout(() => { this.isDragging = false; }, 10);
            this.plotCanvas.style.cursor = 'default';
        });

        // Set initial cursor
        this.plotCanvas.style.cursor = 'grab';
        
        // Mouse wheel - handle zooming
        this.plotCanvas.addEventListener('wheel', e => {
            if (!window.net || window.net.architecture[0] !== 2) return;
            e.preventDefault();
            
            const rect = this.plotCanvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / 300; // Mouse position in canvas (0-1)
            const mouseY = (e.clientY - rect.top) / 300;
            
            // Convert mouse position to real coordinates (before zoom)
            const realMouseX = this.viewBounds.xMin + mouseX * (this.viewBounds.xMax - this.viewBounds.xMin);
            const realMouseY = this.viewBounds.yMax - mouseY * (this.viewBounds.yMax - this.viewBounds.yMin);
            
            // Calculate zoom factor
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9; // Zoom in/out
            const newZoomLevel = this.zoomLevel * zoomFactor;
            
            // Clamp zoom level - REMOVED to allow unlimited zooming
            // if (newZoomLevel < this.minZoom || newZoomLevel > this.maxZoom) return;
            
            this.zoomLevel = newZoomLevel;
            
            // Calculate new view bounds centered on mouse position
            const currentWidth = this.viewBounds.xMax - this.viewBounds.xMin;
            const currentHeight = this.viewBounds.yMax - this.viewBounds.yMin;
            
            const newWidth = currentWidth / zoomFactor;
            const newHeight = currentHeight / zoomFactor;
            
            // Center the zoom on the mouse position
            this.viewBounds.xMin = realMouseX - (realMouseX - this.viewBounds.xMin) * (newWidth / currentWidth);
            this.viewBounds.xMax = this.viewBounds.xMin + newWidth;
            this.viewBounds.yMin = realMouseY - (realMouseY - this.viewBounds.yMin) * (newHeight / currentHeight);
            this.viewBounds.yMax = this.viewBounds.yMin + newHeight;
            
            this.update();
        });
    },

    update() {
        if (!window.net || window.net.architecture[0] !== 2) return;
        
        const resolution = parseInt(document.getElementById('plot-resolution').value);
        const dualCtx = document.getElementById('dual-graph-canvas').getContext('2d');
        this.plotCtx.clearRect(0, 0, 300, 300);
        dualCtx.clearRect(0, 0, 300, 300);
        
        // Use dynamic view bounds instead of fixed bounds
        const { xMin, xMax, yMin, yMax } = this.viewBounds;

        // Helper function to convert real coordinates to pixel coordinates
        const toPixelX = x => (x - xMin) / (xMax - xMin) * 300;
        const toPixelY = y => 300 - ((y - yMin) / (yMax - yMin) * 300); // Flip Y coordinates
        
        // Always update current point from input values
        this.updateCurrentPointFromInputs();
        
        // Draw axes first
        this.plotCtx.strokeStyle = '#333';
        this.plotCtx.lineWidth = 1;
        this.plotCtx.beginPath();
        this.plotCtx.moveTo(toPixelX(0), 0);
        this.plotCtx.lineTo(toPixelX(0), 300);
        this.plotCtx.moveTo(0, toPixelY(0));
        this.plotCtx.lineTo(300, toPixelY(0));
        this.plotCtx.stroke();
        
        const stateMap = new Map();
        let stateCount = 0;
        
        // Initialize global set to store all computed states for neighbor detection
        window.allComputedStates = new Set();
        
        // First pass: identify regions and collect points
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                const x = xMin + (i / resolution) * (xMax - xMin);
                const y = yMin + (j / resolution) * (yMax - yMin); // Remove Y flip here
                window.net.forward([x, y]);
                
                // Get network state from hidden layers only
                let state = '';
                let fullVector = [];
                
                // Include ONLY hidden layers in the state (skip input and output)
                for (let l = 1; l < window.net.activations.length - 1; l++) {
                    const binaryVec = window.net.activations[l].map(neuron => neuron[0] > 0 ? 1 : 0);
                    fullVector = fullVector.concat(binaryVec);
                }
                state = fullVector.join(',');
                
                // Store this state for neighbor detection
                window.allComputedStates.add(state);
                
                if (!stateMap.has(state)) {
                    stateMap.set(state, {
                        id: stateCount++,
                        color: this.colors[stateCount % this.colors.length],
                        points: []
                    });
                }
                
                const region = stateMap.get(state);
                const plotX = Math.floor((i / resolution) * 300);
                const plotY = Math.floor(((resolution - 1 - j) / resolution) * 300); // Flip Y for display: j=0 (yMin) -> bottom, j=max (yMax) -> top
                region.points.push({x: plotX, y: plotY, realX: x, realY: y, state});
                
                // Determine fill color based on neuron highlighting
                if (this.highlightedNeurons.size > 0) {
                    // Check if ALL highlighted neurons are active in this state
                    const stateArray = fullVector;
                    let allNeuronsActive = true;
                    
                    for (const neuronIndex of this.highlightedNeurons) {
                        if (!this.isNeuronActive(stateArray, neuronIndex)) {
                            allNeuronsActive = false;
                            break;
                        }
                    }
                    
                    if (allNeuronsActive) {
                        // Use original color for regions where ALL selected neurons are active
                        this.plotCtx.fillStyle = region.color;
                    } else {
                        // Gray out regions where not all selected neurons are active
                        this.plotCtx.fillStyle = 'rgba(200, 200, 200, 0.5)';
                    }
                } else {
                    // Normal coloring when no neurons are highlighted
                    this.plotCtx.fillStyle = region.color;
                }
                
                this.plotCtx.fillRect(plotX, plotY, Math.ceil(300/resolution), Math.ceil(300/resolution));
            }
        }

        // Calculate region centroids 
        const nodes = [];
        const edges = new Set();
        
        stateMap.forEach((region, state) => {
            const points = region.points;
            const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
            const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
            nodes.push({id: region.id, x: cx, y: cy, color: region.color, state: state});
        });
        
        // Build dual graph edges based on Hamming distance = 1 between states
        const stateList = Array.from(stateMap.keys());
        console.log(`Building dual graph from ${stateList.length} unique states`);
        
        for (let i = 0; i < stateList.length; i++) {
            for (let j = i + 1; j < stateList.length; j++) {
                const state1 = stateList[i].split(',').map(Number);
                const state2 = stateList[j].split(',').map(Number);
                
                // Check if states differ by exactly one bit (Hamming distance = 1)
                const hammingDistance = this.calculateHammingDistance(state1, state2);
                if (hammingDistance === 1) {
                    const region1 = stateMap.get(stateList[i]);
                    const region2 = stateMap.get(stateList[j]);
                    edges.add([
                        Math.min(region1.id, region2.id),
                        Math.max(region1.id, region2.id)
                    ].join(','));
                    console.log(`Edge added between regions ${region1.id} and ${region2.id} (states differ by 1 bit)`);
                }
            }
        }
        
        console.log(`Dual graph created with ${nodes.length} nodes and ${edges.size} edges`);
        
        // Pass data to dual graph module
        DualGraph.render(dualCtx, nodes, edges);

        // Draw current point if it exists
        if (this.currentPoint) {
            const px = ((this.currentPoint.x - xMin) / (xMax - xMin)) * 300;
            const py = (1 - (this.currentPoint.y - yMin) / (yMax - yMin)) * 300; // Flip Y for display
            this.plotCtx.beginPath();
            this.plotCtx.arc(px, py, 5, 0, 2 * Math.PI);
            this.plotCtx.fillStyle = '#fff';
            this.plotCtx.fill();
            this.plotCtx.strokeStyle = '#000';
            this.plotCtx.lineWidth = 2;
            this.plotCtx.stroke();
        }

        // Store dual graph data globally for export
        window.currentDualGraph = { nodes, edges: Array.from(edges) };
        
        // Create/update neuron buttons
        this.createNeuronButtons();
    },

    updateCurrentPointFromInputs() {
        // Get current input values from UI and update currentPoint
        const input0 = document.getElementById('input-0');
        const input1 = document.getElementById('input-1');
        
        if (input0 && input1) {
            const x = parseFloat(input0.value) || 0;
            const y = parseFloat(input1.value) || 0;
            this.currentPoint = { x: x, y: y };
        }
    },

    calculateHammingDistance(state1, state2) {
        if (state1.length !== state2.length) {
            return Infinity; // Invalid comparison
        }
        
        let distance = 0;
        for (let i = 0; i < state1.length; i++) {
            if (state1[i] !== state2[i]) {
                distance++;
            }
        }
        return distance;
    },

    createNeuronButtons() {
        if (!window.net || window.net.architecture[0] !== 2) {
            // Hide neuron buttons for non-2D networks
            const container = document.getElementById('neuron-buttons-container');
            if (container) {
                container.style.display = 'none';
            }
            return;
        }

        const container = document.getElementById('neuron-buttons-container');
        if (!container) return;

        container.style.display = 'block';
        container.innerHTML = '<h4>Highlight Neurons (Multi-Select):</h4>';

        // Calculate neuron indices for each hidden layer
        let neuronIndex = 0;
        for (let layer = 1; layer < window.net.architecture.length - 1; layer++) {
            const layerSize = window.net.architecture[layer];
            
            // Create layer group
            const layerGroup = document.createElement('div');
            layerGroup.className = 'neuron-layer-group';
            
            const layerLabel = document.createElement('div');
            layerLabel.className = 'neuron-layer-label';
            layerLabel.textContent = `Hidden ${layer}:`;
            layerGroup.appendChild(layerLabel);
            
            // Create buttons for each neuron in this layer
            for (let neuron = 0; neuron < layerSize; neuron++) {
                const button = document.createElement('button');
                button.className = 'neuron-button';
                button.textContent = (neuron + 1).toString();
                button.title = `Toggle highlight for Hidden ${layer} Neuron ${neuron + 1}. Shows regions where ALL selected neurons are ON.`;
                
                const globalNeuronIndex = neuronIndex;
                button.addEventListener('click', () => {
                    this.toggleNeuronHighlight(globalNeuronIndex, button);
                });
                
                // Restore selection state if this neuron was previously selected
                if (this.highlightedNeurons.has(globalNeuronIndex)) {
                    button.classList.add('active');
                }
                
                layerGroup.appendChild(button);
                neuronIndex++;
            }
            
            container.appendChild(layerGroup);
        }

        // Add "Show All" button
        const showAllButton = document.createElement('button');
        showAllButton.className = 'neuron-button';
        showAllButton.textContent = 'Clear All';
        showAllButton.title = 'Clear all neuron selections and show all regions with original colors';
        showAllButton.addEventListener('click', () => {
            this.clearNeuronHighlight();
        });
        
        container.appendChild(showAllButton);
    },

    toggleNeuronHighlight(neuronIndex, button) {
        // Toggle the neuron in the set
        if (this.highlightedNeurons.has(neuronIndex)) {
            // Remove from highlighted set
            this.highlightedNeurons.delete(neuronIndex);
            button.classList.remove('active');
        } else {
            // Add to highlighted set
            this.highlightedNeurons.add(neuronIndex);
            button.classList.add('active');
        }
        
        // Update legacy single neuron for backward compatibility with BinaryDisplay
        this.highlightedNeuron = this.highlightedNeurons.size > 0 ? 
            Array.from(this.highlightedNeurons)[0] : null;
        
        this.update();
        
        // Also update the binary display to show the highlighted neurons
        if (typeof BinaryDisplay !== 'undefined' && BinaryDisplay.update) {
            BinaryDisplay.update();
        }
    },

    clearNeuronHighlight() {
        this.highlightedNeuron = null;
        this.highlightedNeurons.clear();
        const allButtons = document.querySelectorAll('.neuron-button');
        allButtons.forEach(btn => btn.classList.remove('active'));
        this.update();
        
        // Also update the binary display to remove highlighting
        if (typeof BinaryDisplay !== 'undefined' && BinaryDisplay.update) {
            BinaryDisplay.update();
        }
    },

    isNeuronActive(state, neuronIndex) {
        // Check if the specified neuron is active (state = 1) in the given state vector
        if (!state || neuronIndex >= state.length) return false;
        
        // Convert comma-separated state string to array if needed
        const stateArray = typeof state === 'string' ? state.split(',').map(Number) : state;
        return stateArray[neuronIndex] === 1;
    },

    resetView() {
        this.viewBounds = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
        this.panOffset = { x: 0, y: 0 };
        this.zoomLevel = 1.0;
        // Optionally clear neuron selections - uncomment if desired
        // this.clearNeuronHighlight();
        this.updateZoomDisplay();
        this.update();
    },

    zoom(factor) {
        if (!window.net || window.net.architecture[0] !== 2) return;
        
        const newZoomLevel = this.zoomLevel * factor;
        
        // Clamp zoom level - REMOVED to allow unlimited zooming
        // if (newZoomLevel < this.minZoom || newZoomLevel > this.maxZoom) return;
        
        this.zoomLevel = newZoomLevel;
        
        // Calculate new view bounds (zoom from center)
        const currentWidth = this.viewBounds.xMax - this.viewBounds.xMin;
        const currentHeight = this.viewBounds.yMax - this.viewBounds.yMin;
        const centerX = (this.viewBounds.xMin + this.viewBounds.xMax) / 2;
        const centerY = (this.viewBounds.yMin + this.viewBounds.yMax) / 2;
        
        const newWidth = currentWidth / factor;
        const newHeight = currentHeight / factor;
        
        this.viewBounds.xMin = centerX - newWidth / 2;
        this.viewBounds.xMax = centerX + newWidth / 2;
        this.viewBounds.yMin = centerY - newHeight / 2;
        this.viewBounds.yMax = centerY + newHeight / 2;
        
        this.updateZoomDisplay();
        this.update();
    },

    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoom-display');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
    },
};

// Global function for backward compatibility
function updatePlot() {
    DecisionBoundary.update();
}
