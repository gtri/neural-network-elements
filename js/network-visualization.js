// Network Visualization Module
const NetworkVisualization = {
    canvas: null,
    ctx: null,
    zoomLevel: 1,
    targetZoomLevel: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    animationFrameId: null,
    zoomSpeed: 0.15,
    minZoom: 0.1,
    maxZoom: 5,
    lastWheelTime: 0,
    wheelThrottle: 16, // Throttle wheel events to ~60fps
    
    // Enhanced visual properties
    colors: {
        background: '#f8fafc',
        neuronPositive: '#3b82f6',
        neuronNegative: '#ef4444',
        neuronInactive: '#64748b',
        connectionPositive: '#10b981',
        connectionNegative: '#f97316',
        text: '#1e293b',
        layerLabel: '#475569',
        neuronBorder: '#e2e8f0',
        shadow: 'rgba(0, 0, 0, 0.1)'
    },

    init() {
        this.canvas = document.getElementById('canvas');
        if (!this.canvas) {
            console.error('Canvas element with id "canvas" not found');
            return false;
        }
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.startAnimationLoop();
        return true;
    },

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', e => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', e => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;
                this.panX += deltaX;
                this.panY += deltaY;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                // Only redraw, don't recalculate network state
                requestAnimationFrame(() => {
                    this.draw(true); // Pass true to indicate this is just a visual update
                });
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', e => {
            e.preventDefault();
            
            // Throttle wheel events for smoother scrolling
            const now = performance.now();
            if (now - this.lastWheelTime < this.wheelThrottle) {
                return;
            }
            this.lastWheelTime = now;
            
            // Get mouse position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate zoom factor based on delta magnitude for smoother scrolling
            const zoomIntensity = 0.1;
            const delta = e.deltaY;
            const scaleFactor = delta > 0 ? 1 - zoomIntensity : 1 + zoomIntensity;
            
            // Zoom towards mouse cursor
            this.zoomTowards(mouseX, mouseY, scaleFactor);
        });

        // Add touch support for mobile devices
        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;
            }
        });

        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            if (e.touches.length === 1 && this.isDragging) {
                const deltaX = e.touches[0].clientX - this.lastMouseX;
                const deltaY = e.touches[0].clientY - this.lastMouseY;
                this.panX += deltaX;
                this.panY += deltaY;
                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;
            }
        });

        this.canvas.addEventListener('touchend', e => {
            e.preventDefault();
            this.isDragging = false;
        });
    },

    startAnimationLoop() {
        let lastTime = 0;
        const animate = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            // Smooth zoom animation with frame rate independence
            if (Math.abs(this.zoomLevel - this.targetZoomLevel) > 0.001) {
                const zoomDiff = this.targetZoomLevel - this.zoomLevel;
                const adjustedSpeed = Math.min(this.zoomSpeed * (deltaTime / 16), 1); // Normalize to 60fps
                this.zoomLevel += zoomDiff * adjustedSpeed;
                this.updateZoomDisplay();
                this.draw(true);
            }
            this.animationFrameId = requestAnimationFrame(animate);
        };
        animate(0);
    },

    zoomTowards(mouseX, mouseY, factor) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoomLevel * factor));
        
        if (Math.abs(newZoom - this.targetZoomLevel) > 0.001) {
            // Calculate world coordinates of mouse position before zoom
            const worldX = (mouseX - this.panX) / this.zoomLevel;
            const worldY = (mouseY - this.panY) / this.zoomLevel;
            
            // Update target zoom
            this.targetZoomLevel = newZoom;
            
            // Adjust pan to keep mouse position fixed - use current zoom level for immediate response
            this.panX = mouseX - worldX * this.zoomLevel;
            this.panY = mouseY - worldY * this.zoomLevel;
        }
    },

    updateZoomDisplay() {
        const zoomElement = document.getElementById('zoom-level');
        if (zoomElement) {
            zoomElement.textContent = Math.round(this.zoomLevel * 100) + '%';
        }
        
        // Update zoom slider if it exists
        const slider = document.getElementById('zoom-slider');
        if (slider) {
            slider.value = Math.round(this.zoomLevel * 100);
        }
    },

    draw(visualOnly = false) {
        if (!window.net) return;
        
        // Create a beautiful gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        const layers = window.net.architecture;
        const maxN = Math.max(...layers);
        const layerSpacing = Math.max(180, 600 / layers.length);
        const x = layers.map((_, i) => 120 + i * layerSpacing);
        
        // Draw connections with enhanced styling
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        this.ctx.shadowBlur = 2;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        for (let l = 0; l < layers.length - 1; l++) {
            for (let i = 0; i < layers[l]; i++) {
                for (let j = 0; j < layers[l + 1]; j++) {
                    const x1 = x[l], y1 = 120 + (360 / maxN) * i + (360 - layers[l] * (360 / maxN)) / 2;
                    const x2 = x[l + 1], y2 = 120 + (360 / maxN) * j + (360 - layers[l + 1] * (360 / maxN)) / 2;
                    const w = window.net.weights[l][j][i];
                    const intensity = Math.min(Math.abs(w), 1);
                    
                    // Create gradient for connections
                    const connectionGradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
                    if (w > 0) {
                        connectionGradient.addColorStop(0, `rgba(16, 185, 129, ${intensity * 0.8})`);
                        connectionGradient.addColorStop(1, `rgba(52, 211, 153, ${intensity * 0.6})`);
                    } else {
                        connectionGradient.addColorStop(0, `rgba(239, 68, 68, ${intensity * 0.8})`);
                        connectionGradient.addColorStop(1, `rgba(248, 113, 113, ${intensity * 0.6})`);
                    }
                    
                    this.ctx.strokeStyle = connectionGradient;
                    this.ctx.lineWidth = Math.max(0.8, intensity * 3);
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1 + 18, y1);
                    this.ctx.lineTo(x2 - 18, y2);
                    this.ctx.stroke();
                }
            }
        }
        
        // Reset shadow for neurons
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Draw neurons with enhanced styling
        for (let l = 0; l < layers.length; l++) {
            for (let i = 0; i < layers[l]; i++) {
                const nx = x[l], ny = 120 + (360 / maxN) * i + (360 - layers[l] * (360 / maxN)) / 2;
                let act = 0;
                if (window.net.activations && window.net.activations[l]) {
                    act = visualOnly ? window.net.activations[l][i][0] : parseFloat(window.net.activations[l][i][0].toFixed(3));
                }
                
                // Create radial gradient for neurons
                const neuronGradient = this.ctx.createRadialGradient(nx - 3, ny - 3, 0, nx, ny, 18);
                
                if (act === 0) {
                    neuronGradient.addColorStop(0, '#94a3b8');
                    neuronGradient.addColorStop(1, '#475569');
                } else {
                    const intensity = Math.min(Math.abs(act) / 2, 1);
                    if (act > 0) {
                        neuronGradient.addColorStop(0, `hsl(220, 90%, ${85 - intensity * 25}%)`);
                        neuronGradient.addColorStop(1, `hsl(220, 80%, ${60 - intensity * 20}%)`);
                    } else {
                        neuronGradient.addColorStop(0, `hsl(0, 85%, ${85 - intensity * 25}%)`);
                        neuronGradient.addColorStop(1, `hsl(0, 75%, ${60 - intensity * 20}%)`);
                    }
                }
                
                // Draw neuron circle
                this.ctx.fillStyle = neuronGradient;
                this.ctx.beginPath();
                this.ctx.arc(nx, ny, 18, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Add subtle border
                this.ctx.strokeStyle = act === 0 ? '#64748b' : (act > 0 ? '#1e40af' : '#dc2626');
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Reset shadow for text
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
                
                // Draw activation value with better typography
                this.ctx.fillStyle = act === 0 ? '#ffffff' : (Math.abs(act) > 1 ? '#ffffff' : '#1e293b');
                this.ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(act.toFixed(1), nx, ny);
            }
        }
        
        // Draw layer labels with enhanced styling
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        this.ctx.shadowBlur = 2;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        this.ctx.fillStyle = '#1e293b';
        this.ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Input layer
        this.ctx.fillText('Input', x[0], 90);
        
        // Hidden layers
        for (let i = 1; i < layers.length - 1; i++) {
            this.ctx.fillText(`Hidden ${i}`, x[i], 90);
        }
        
        // Output layer
        this.ctx.fillText('Output', x[layers.length - 1], 90);
        
        // Add subtle layer background panels
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        for (let l = 0; l < layers.length; l++) {
            const layerHeight = (360 / maxN) * layers[l] + 60;
            const layerY = 120 + (360 - layers[l] * (360 / maxN)) / 2 - 30;
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.strokeStyle = 'rgba(226, 232, 240, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.roundRect(x[l] - 35, layerY, 70, layerHeight, 8);
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    },

    zoom(factor, centerX = null, centerY = null) {
        if (centerX !== null && centerY !== null) {
            // Zoom towards specific point
            this.zoomTowards(centerX, centerY, factor);
        } else {
            // Zoom towards center of canvas
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.zoomTowards(centerX, centerY, factor);
        }
    },

    setZoom(zoomLevel) {
        this.targetZoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));
        this.updateZoomDisplay();
    },

    resetZoom() {
        this.targetZoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateZoomDisplay();
    },

    // Enhanced zoom controls with smooth animation
    zoomIn() {
        this.zoom(1.2);
    },

    zoomOut() {
        this.zoom(0.8);
    },

    // Fit network to view
    fitToView() {
        if (!window.net) return;
        
        const layers = window.net.architecture;
        const maxN = Math.max(...layers);
        const layerSpacing = Math.max(180, 600 / layers.length);
        
        // Calculate network bounds
        const networkWidth = 120 + (layers.length - 1) * layerSpacing + 120;
        const networkHeight = 120 + 360 + 120;
        
        // Calculate required zoom to fit network in canvas
        const zoomX = (this.canvas.width * 0.9) / networkWidth;
        const zoomY = (this.canvas.height * 0.9) / networkHeight;
        const fitZoom = Math.min(zoomX, zoomY);
        
        this.targetZoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, fitZoom));
        
        // Center the network
        this.panX = (this.canvas.width - networkWidth * this.targetZoomLevel) / 2;
        this.panY = (this.canvas.height - networkHeight * this.targetZoomLevel) / 2;
        
        this.updateZoomDisplay();
    },

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
};

// Global zoom functions for backward compatibility
function zoom(factor) {
    NetworkVisualization.zoom(factor);
}

function resetZoom() {
    NetworkVisualization.resetZoom();
}

// Additional zoom control functions
function zoomIn() {
    NetworkVisualization.zoomIn();
}

function zoomOut() {
    NetworkVisualization.zoomOut();
}

function fitToView() {
    NetworkVisualization.fitToView();
}
