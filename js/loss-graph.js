// Loss Graph Management Module
const LossGraph = {
    canvas: null,
    ctx: null,
    lossHistory: [],
    networkStates: [], // Store network states for each step
    currentStep: -1, // Track which step we're viewing
    maxDataPoints: 1000, // Maximum number of points to display
    isInitialized: false,

    init() {
        this.canvas = document.getElementById('loss-graph-canvas');
        if (!this.canvas) {
            console.error('Loss graph canvas not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.isInitialized = true;
        this.setupEventListeners();
        this.draw();
    },

    setupEventListeners() {
        // Add click event listener for jumping to training steps
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Add hover cursor styling
        this.canvas.addEventListener('mousemove', (e) => this.handleHover(e));
        
        // Listen for window resize to redraw graph
        window.addEventListener('resize', () => {
            if (this.isInitialized) {
                setTimeout(() => this.draw(), 100);
            }
        });
    },

    addLossValue(loss, step) {
        if (!this.isInitialized) return;
        
        // Save current network state
        if (window.net && typeof window.net.saveState === 'function') {
            this.networkStates.push(window.net.saveState());
        } else {
            // Fallback: save a placeholder
            this.networkStates.push(null);
        }
        
        this.lossHistory.push({ loss, step });
        this.currentStep = this.lossHistory.length - 1; // Update current step to latest
        
        // Keep only the most recent maxDataPoints
        if (this.lossHistory.length > this.maxDataPoints) {
            this.lossHistory.shift();
            this.networkStates.shift();
            this.currentStep = Math.max(0, this.currentStep - 1);
        }
        
        this.draw();
        this.updateStatsDisplay();
    },

    updateStatsDisplay() {
        const statsElement = document.getElementById('loss-stats');
        if (!statsElement) return;
        
        const stats = this.getStats();
        if (this.lossHistory.length === 0) {
            statsElement.innerHTML = '';
            return;
        }
        
        const currentLoss = this.lossHistory[this.lossHistory.length - 1].loss;
        const currentStepDisplay = this.currentStep >= 0 ? this.currentStep + 1 : this.lossHistory.length;
        const viewingText = this.currentStep >= 0 && this.currentStep !== this.lossHistory.length - 1 
            ? `<span style="color: #e74c3c;">Viewing: Step ${currentStepDisplay}</span>` 
            : 'Viewing: Latest';
        
        statsElement.innerHTML = `
            <div style="font-size: 11px; color: #666;">
                Current: ${currentLoss.toFixed(6)} | 
                Best: ${stats.min.toFixed(6)} | 
                Steps: ${this.lossHistory.length} | 
                ${viewingText}
            </div>
        `;
    },

    clearHistory() {
        this.lossHistory = [];
        this.networkStates = [];
        this.currentStep = -1;
        this.updateStatsDisplay();
        if (this.isInitialized) {
            this.draw();
        }
    },

    draw() {
        if (!this.ctx || !this.canvas) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);

        if (this.lossHistory.length === 0) {
            this.drawEmptyState();
            return;
        }

        // Calculate margins
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;

        // Find data ranges
        const minStep = Math.min(...this.lossHistory.map(d => d.step));
        const maxStep = Math.max(...this.lossHistory.map(d => d.step));
        const minLoss = Math.min(...this.lossHistory.map(d => d.loss));
        const maxLoss = Math.max(...this.lossHistory.map(d => d.loss));

        // Add some padding to loss range
        const lossRange = maxLoss - minLoss;
        const lossPadding = lossRange === 0 ? 1 : lossRange * 0.1;
        const adjustedMinLoss = Math.max(0, minLoss - lossPadding);
        const adjustedMaxLoss = maxLoss + lossPadding;

        // Scale functions
        const scaleX = (step) => margin.left + ((step - minStep) / Math.max(1, maxStep - minStep)) * plotWidth;
        const scaleY = (loss) => margin.top + (1 - (loss - adjustedMinLoss) / Math.max(0.001, adjustedMaxLoss - adjustedMinLoss)) * plotHeight;

        // Draw background
        this.ctx.fillStyle = '#fafafa';
        this.ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

        // Draw grid
        this.drawGrid(margin, plotWidth, plotHeight, minStep, maxStep, adjustedMinLoss, adjustedMaxLoss, scaleX, scaleY);

        // Draw axes
        this.drawAxes(margin, plotWidth, plotHeight);

        // Draw loss line
        this.drawLossLine(scaleX, scaleY);

        // Draw axes labels and title
        this.drawLabels(margin, width, height, minStep, maxStep, adjustedMinLoss, adjustedMaxLoss);
    },

    drawEmptyState() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, width, height);
        
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('No training data yet', width / 2, height / 2 - 10);
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Start training to see loss curve', width / 2, height / 2 + 15);
        this.ctx.fillText('Click points on the curve to jump to training steps', width / 2, height / 2 + 35);
    },

    drawGrid(margin, plotWidth, plotHeight, minStep, maxStep, minLoss, maxLoss, scaleX, scaleY) {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;

        // Vertical grid lines (steps)
        const stepRange = maxStep - minStep;
        const stepTicks = Math.min(10, Math.max(2, stepRange / 10));
        for (let i = 0; i <= stepTicks; i++) {
            const step = minStep + (stepRange * i / stepTicks);
            const x = scaleX(step);
            this.ctx.beginPath();
            this.ctx.moveTo(x, margin.top);
            this.ctx.lineTo(x, margin.top + plotHeight);
            this.ctx.stroke();
        }

        // Horizontal grid lines (loss)
        const lossRange = maxLoss - minLoss;
        const lossTicks = 8;
        for (let i = 0; i <= lossTicks; i++) {
            const loss = minLoss + (lossRange * i / lossTicks);
            const y = scaleY(loss);
            this.ctx.beginPath();
            this.ctx.moveTo(margin.left, y);
            this.ctx.lineTo(margin.left + plotWidth, y);
            this.ctx.stroke();
        }
    },

    drawAxes(margin, plotWidth, plotHeight) {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;

        // Y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(margin.left, margin.top);
        this.ctx.lineTo(margin.left, margin.top + plotHeight);
        this.ctx.stroke();

        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(margin.left, margin.top + plotHeight);
        this.ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
        this.ctx.stroke();
    },

    drawLossLine(scaleX, scaleY) {
        if (this.lossHistory.length < 2) {
            // Draw single point if only one data point
            if (this.lossHistory.length === 1) {
                this.ctx.fillStyle = '#e74c3c';
                const x = scaleX(this.lossHistory[0].step);
                const y = scaleY(this.lossHistory[0].loss);
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            return;
        }

        // Draw loss curve
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        const firstPoint = this.lossHistory[0];
        this.ctx.moveTo(scaleX(firstPoint.step), scaleY(firstPoint.loss));

        for (let i = 1; i < this.lossHistory.length; i++) {
            const point = this.lossHistory[i];
            this.ctx.lineTo(scaleX(point.step), scaleY(point.loss));
        }

        this.ctx.stroke();

        // Draw clickable points
        this.ctx.fillStyle = '#3498db';
        for (let i = 0; i < this.lossHistory.length; i++) {
            const point = this.lossHistory[i];
            this.ctx.beginPath();
            this.ctx.arc(scaleX(point.step), scaleY(point.loss), 3, 0, 2 * Math.PI);
            this.ctx.fill();
        }

        // Highlight current step if set
        if (this.currentStep >= 0 && this.currentStep < this.lossHistory.length) {
            const point = this.lossHistory[this.currentStep];
            const x = scaleX(point.step);
            const y = scaleY(point.loss);
            
            // Draw larger highlighted point
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw white center
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw vertical dashed line
            this.ctx.strokeStyle = '#e74c3c';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(x, scaleY(Math.min(...this.lossHistory.map(d => d.loss))));
            this.ctx.lineTo(x, scaleY(Math.max(...this.lossHistory.map(d => d.loss))));
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    },

    drawLabels(margin, width, height, minStep, maxStep, minLoss, maxLoss) {
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px Arial';

        // Y-axis label (Loss)
        this.ctx.save();
        this.ctx.translate(15, height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loss', 0, 0);
        this.ctx.restore();

        // X-axis label (Steps)
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Training Steps', width / 2, height - 10);

        // Title
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('Training Loss over Time', width / 2, 15);

        // Y-axis tick labels
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'right';
        const lossRange = maxLoss - minLoss;
        const lossTicks = 8;
        for (let i = 0; i <= lossTicks; i++) {
            const loss = minLoss + (lossRange * i / lossTicks);
            const y = margin.top + (1 - i / lossTicks) * (height - margin.top - margin.bottom);
            this.ctx.fillText(loss.toFixed(3), margin.left - 5, y + 3);
        }

        // X-axis tick labels
        this.ctx.textAlign = 'center';
        const stepRange = maxStep - minStep;
        const stepTicks = Math.min(10, Math.max(2, Math.floor(stepRange / 10)));
        for (let i = 0; i <= stepTicks; i++) {
            const step = Math.round(minStep + (stepRange * i / stepTicks));
            const x = margin.left + (i / stepTicks) * (width - margin.left - margin.right);
            this.ctx.fillText(step.toString(), x, height - margin.bottom + 15);
        }
        
        // Add instruction text
        this.ctx.font = '11px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#666';
        this.ctx.fillText('Click any point to jump to that training step', width - 10, 35);
    },

    handleClick(event) {
        if (this.lossHistory.length === 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert click position to step number
        const margin = { left: 60, right: 30, top: 20, bottom: 50 };
        const plotWidth = this.canvas.width - margin.left - margin.right;
        const relativeX = (x - margin.left) / plotWidth;
        
        if (relativeX < 0 || relativeX > 1) return;
        
        const targetStep = Math.round(relativeX * (this.lossHistory.length - 1));
        
        if (targetStep >= 0 && targetStep < this.networkStates.length) {
            this.jumpToStep(targetStep);
        }
    },

    handleHover(event) {
        if (this.lossHistory.length === 0) {
            this.canvas.style.cursor = 'default';
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const margin = { left: 60, right: 30, top: 20, bottom: 50 };
        const plotWidth = this.canvas.width - margin.left - margin.right;
        const relativeX = (x - margin.left) / plotWidth;
        
        if (relativeX >= 0 && relativeX <= 1) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
    },

    jumpToStep(step) {
        if (step < 0 || step >= this.networkStates.length) return;
        
        // Restore network state
        if (window.net && this.networkStates[step]) {
            window.net.loadState(this.networkStates[step]);
            this.currentStep = step;
            
            // Update all visualizations
            if (typeof createWeights === 'function') {
                createWeights();
            }
            if (typeof forward === 'function') {
                forward();
            }
            if (typeof NetworkVisualization !== 'undefined' && NetworkVisualization.draw) {
                NetworkVisualization.draw();
            }
            if (typeof DecisionBoundary !== 'undefined' && DecisionBoundary.update) {
                DecisionBoundary.update();
            }
            if (typeof Visualization3D !== 'undefined' && Visualization3D.update) {
                Visualization3D.update();
            }
            if (typeof BinaryDisplay !== 'undefined' && BinaryDisplay.update) {
                BinaryDisplay.update();
            }
            
            // Redraw loss graph with current step highlighted
            this.draw();
            
            // Show notification
            this.showStepInfo(step);
        }
    },

    showStepInfo(step) {
        const loss = this.lossHistory[step];
        const info = document.createElement('div');
        info.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2c3e50;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        info.innerHTML = `Jumped to Step ${step + 1}<br>Loss: ${loss.loss.toFixed(6)}`;
        
        document.body.appendChild(info);
        
        // Fade out after 2 seconds
        setTimeout(() => {
            info.style.transition = 'opacity 0.5s';
            info.style.opacity = '0';
            setTimeout(() => {
                if (info.parentNode) {
                    info.parentNode.removeChild(info);
                }
            }, 500);
        }, 1500);
    },

    // Get current loss statistics
    getStats() {
        if (this.lossHistory.length === 0) {
            return { current: 0, min: 0, max: 0, average: 0 };
        }

        const losses = this.lossHistory.map(d => d.loss);
        const current = losses[losses.length - 1];
        const min = Math.min(...losses);
        const max = Math.max(...losses);
        const average = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;

        return { current, min, max, average };
    }
};

// Global functions for backward compatibility
function initializeLossGraph() {
    LossGraph.init();
}

function clearLossHistory() {
    LossGraph.clearHistory();
}
