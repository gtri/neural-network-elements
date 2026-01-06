// Training and Data Management Module
const TrainingManager = {
    data: [],
    continuousTrainingTimer: null,
    isContinuousTraining: false,
    holdTimer: null,
    holdDelay: 100, // 500ms delay before starting continuous training
    trainingInterval: 1000, // milliseconds between training steps (1 second default)
    stepCounter: 0, // Track training steps for loss graph

    addData() {
        const inputs = [];
        for (let i = 0; i < window.net.architecture[0]; i++) {
            inputs.push(parseFloat(document.getElementById(`input-${i}`).value) || 0);
        }
        const targets = [];
        for (let i = 0; i < window.net.architecture[window.net.architecture.length - 1]; i++) {
            const t = prompt(`Enter target output ${i + 1}:`);
            if (t !== null) targets.push(parseFloat(t) || 0);
        }
        if (targets.length === window.net.architecture[window.net.architecture.length - 1]) {
            this.data.push({ inputs: [...inputs], targets: [...targets] });
            this.updateDataDisplay();
        }
    },

    clearData() {
        this.data = [];
        this.stepCounter = 0; // Reset step counter
        this.updateDataDisplay();
        document.getElementById('error').innerHTML = '';
        // Clear loss graph
        if (typeof LossGraph !== 'undefined') {
            LossGraph.clearHistory();
        }
    },

    updateDataDisplay() {
        const c = document.getElementById('training-data');
        c.innerHTML = '';
        this.data.forEach((p, i) => {
            const d = document.createElement('div');
            d.innerHTML = `${i + 1}: [${p.inputs.map(x => x.toFixed(1)).join(',')}] → [${p.targets.map(x => x.toFixed(1)).join(',')}] <button onclick="TrainingManager.removeData(${i})" style="font-size:10px;padding:2px 4px">×</button>`;
            c.appendChild(d);
        });
    },

    removeData(index) {
        this.data.splice(index, 1);
        this.updateDataDisplay();
    },

    trainStep() {
        if (this.data.length === 0) return;
        const lr = parseFloat(document.getElementById('learning-rate').value);
        let totalLoss = 0;
        this.data.forEach(p => totalLoss += window.net.backward(p.inputs, p.targets, lr));
        const avgLoss = totalLoss / this.data.length;
        
        // Increment step counter
        this.stepCounter++;
        
        // Update loss display
        document.getElementById('error').innerHTML = `Loss: ${avgLoss.toFixed(4)} | Step: ${this.stepCounter}`;
        
        // Add to loss graph
        if (typeof LossGraph !== 'undefined') {
            LossGraph.addLossValue(avgLoss, this.stepCounter);
        }
        
        createWeights();
        forward();
    },

    trainBatch() {
        for (let i = 0; i < 100; i++) this.trainStep();
    },

    startContinuousTraining() {
        if (this.isContinuousTraining || this.data.length === 0) return;
        
        this.isContinuousTraining = true;
        this.continuousTrainingTimer = setInterval(() => {
            this.trainStep();
        }, this.trainingInterval); // Use configurable interval
        
        // Add visual feedback
        const trainButton = document.querySelector('button.btn-train');
        if (trainButton) {
            trainButton.style.backgroundColor = '#e74c3c';
            trainButton.style.boxShadow = '0 0 10px rgba(231, 76, 60, 0.5)';
        }
        
        // Update play/pause buttons
        this.updatePlayPauseButtons();
        
        console.log('Continuous training started');
    },

    stopContinuousTraining() {
        if (!this.isContinuousTraining) return;
        
        this.isContinuousTraining = false;
        if (this.continuousTrainingTimer) {
            clearInterval(this.continuousTrainingTimer);
            this.continuousTrainingTimer = null;
        }
        
        // Remove visual feedback
        const trainButton = document.querySelector('button.btn-train');
        if (trainButton) {
            trainButton.style.backgroundColor = '';
            trainButton.style.boxShadow = '';
        }
        
        // Update play/pause buttons
        this.updatePlayPauseButtons();
        
        console.log('Continuous training stopped');
    },

    handleTrainButtonDown() {
        if (this.data.length === 0) return;
        
        // Start a timer to begin continuous training after holdDelay
        this.holdTimer = setTimeout(() => {
            this.startContinuousTraining();
        }, this.holdDelay);
    },

    handleTrainButtonUp() {
        // Clear the hold timer
        if (this.holdTimer) {
            clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }
        
        // If continuous training is active, stop it
        if (this.isContinuousTraining) {
            this.stopContinuousTraining();
        } else {
            // If continuous training never started, perform a single training step
            this.trainStep();
        }
    },

    generateDataPoints() {
        if (window.net.architecture[0] !== 2) return;
        
        const funcStr = document.getElementById('target-function').value;
        const numPoints = parseInt(document.getElementById('sample-points').value);
        
        try {
            // Test the function first
            const func = new Function('x', 'y', `return ${funcStr}`);
            
            this.data = []; // Clear existing data
            
            // First pass: compute min/max for normalization
            let minVal = Infinity, maxVal = -Infinity;
            const rawData = [];
            for (let i = 0; i < numPoints; i++) {
                const x = (Math.random() * 6) - 3;
                const y = (Math.random() * 6) - 3;
                const target = func(x, y);
                
                if (!isFinite(target)) {
                    throw new Error("Function produced invalid value at (" + x + "," + y + ")");
                }
                
                rawData.push({x, y, target});
                minVal = Math.min(minVal, target);
                maxVal = Math.max(maxVal, target);
            }
            
            // Second pass: normalize and store
            const range = maxVal - minVal;
            for (const point of rawData) {
                let normalizedTarget;
                if (range === 0) {
                    // Constant function - keep the original value but clamp to reasonable range
                    normalizedTarget = Math.max(-10, Math.min(10, point.target));
                } else {
                    // Variable function - normalize to [-1, 1] range
                    normalizedTarget = (2 * (point.target - minVal) / range - 1);
                }
                
                this.data.push({
                    inputs: [point.x, point.y],
                    targets: [normalizedTarget]
                });
            }
            
            // Set a conservative learning rate
            document.getElementById('learning-rate').value = '0.001';
            
            this.updateDataDisplay();
            if (range === 0) {
                document.getElementById('error').innerHTML = 
                    `Data generated with constant value: ${minVal.toFixed(2)}`;
            } else {
                document.getElementById('error').innerHTML = 
                    `Data generated and normalized (original range: ${minVal.toFixed(2)} to ${maxVal.toFixed(2)})`;
            }
        } catch (err) {
            document.getElementById('error').innerHTML = 'Invalid function: ' + err.message;
        }
    },

    importTrainingData() {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 500px;
            max-width: 90%;
            max-height: 80%;
            overflow-y: auto;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin-top: 0; color: #2c3e50;">Import Training Data</h3>
            <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
                Paste training data as (input,output) pairs. Supported formats:
            </p>
            <ul style="margin-bottom: 15px; color: #666; font-size: 12px; padding-left: 20px;">
                <li>One pair per line: <code>1.0,2.0 -> 3.0</code></li>
                <li>JSON format: <code>[{"inputs": [1.0, 2.0], "targets": [3.0]}]</code></li>
                <li>Comma-separated: <code>1.0,2.0,3.0</code> (last value is target)</li>
            </ul>
            <textarea id="import-textarea" placeholder="Paste your training data here..." style="
                width: 100%;
                height: 200px;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                resize: vertical;
                box-sizing: border-box;
            "></textarea>
            <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancel-import" style="
                    padding: 8px 16px;
                    border: 1px solid #ccc;
                    background:rgb(219, 52, 71);
                    border-radius: 4px;
                    cursor: pointer;
                ">Cancel</button>
                <button id="confirm-import" style="
                    padding: 8px 16px;
                    border: none;
                    background: #3498db;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">Import Data</button>
            </div>
            <div id="import-error" style="
                margin-top: 10px;
                color: #e74c3c;
                font-size: 12px;
                display: none;
            "></div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // Focus on textarea
        setTimeout(() => document.getElementById('import-textarea').focus(), 100);
        
        // Handle close events
        const closeModal = () => document.body.removeChild(modal);
        
        document.getElementById('cancel-import').onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
        
        // Handle import
        document.getElementById('confirm-import').onclick = () => {
            const text = document.getElementById('import-textarea').value.trim();
            const errorDiv = document.getElementById('import-error');
            
            if (!text) {
                errorDiv.textContent = 'Please enter some training data.';
                errorDiv.style.display = 'block';
                return;
            }
            
            try {
                const importedData = this.parseTrainingData(text);
                
                if (importedData.length === 0) {
                    errorDiv.textContent = 'No valid data points found.';
                    errorDiv.style.display = 'block';
                    return;
                }
                
                // Validate data dimensions
                const inputSize = window.net.architecture[0];
                const outputSize = window.net.architecture[window.net.architecture.length - 1];
                
                const invalidData = importedData.find(point => 
                    point.inputs.length !== inputSize || point.targets.length !== outputSize
                );
                
                if (invalidData) {
                    errorDiv.textContent = `Data dimensions don't match network architecture. Expected ${inputSize} inputs and ${outputSize} outputs.`;
                    errorDiv.style.display = 'block';
                    return;
                }
                
                // Clear existing data and add imported data
                this.data = importedData;
                this.stepCounter = 0;
                this.updateDataDisplay();
                
                // Clear loss graph
                if (typeof LossGraph !== 'undefined') {
                    LossGraph.clearHistory();
                }
                
                document.getElementById('error').innerHTML = `Successfully imported ${importedData.length} data points.`;
                closeModal();
                
            } catch (err) {
                errorDiv.textContent = 'Error parsing data: ' + err.message;
                errorDiv.style.display = 'block';
            }
        };
        
        // Handle Enter key in textarea
        document.getElementById('import-textarea').onkeydown = (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                document.getElementById('confirm-import').click();
            }
        };
    },

    parseTrainingData(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        const data = [];
        
        // Try to detect format
        const firstLine = lines[0];
        
        // Check if it's JSON format
        if (firstLine.startsWith('[') || firstLine.startsWith('{')) {
            try {
                const jsonData = JSON.parse(text);
                const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
                
                for (const item of dataArray) {
                    if (item.inputs && item.targets) {
                        data.push({
                            inputs: Array.isArray(item.inputs) ? item.inputs : [item.inputs],
                            targets: Array.isArray(item.targets) ? item.targets : [item.targets]
                        });
                    }
                }
                return data;
            } catch (err) {
                // Fall through to other parsing methods
            }
        }
        
        // Parse line by line
        for (const line of lines) {
            try {
                // Try arrow format: "1.0,2.0 -> 3.0" or "1.0,2.0->3.0"
                if (line.includes('->')) {
                    const [inputPart, outputPart] = line.split('->').map(s => s.trim());
                    const inputs = inputPart.split(',').map(s => parseFloat(s.trim()));
                    const targets = outputPart.split(',').map(s => parseFloat(s.trim()));
                    
                    if (inputs.every(x => !isNaN(x)) && targets.every(x => !isNaN(x))) {
                        data.push({ inputs, targets });
                        continue;
                    }
                }
                
                // Try comma-separated format: "1.0,2.0,3.0" (last value is target)
                const values = line.split(',').map(s => parseFloat(s.trim()));
                if (values.length >= 2 && values.every(x => !isNaN(x))) {
                    const inputs = values.slice(0, -1);
                    const targets = [values[values.length - 1]];
                    data.push({ inputs, targets });
                    continue;
                }
                
                // Try space-separated format
                const spaceValues = line.split(/\s+/).map(s => parseFloat(s));
                if (spaceValues.length >= 2 && spaceValues.every(x => !isNaN(x))) {
                    const inputs = spaceValues.slice(0, -1);
                    const targets = [spaceValues[spaceValues.length - 1]];
                    data.push({ inputs, targets });
                    continue;
                }
                
            } catch (err) {
                // Skip invalid lines
                console.warn('Skipped invalid line:', line);
            }
        }
        
        return data;
    },

    updateTrainingInterval(value) {
        this.trainingInterval = parseInt(value);
        
        // If continuous training is active, restart it with the new interval
        if (this.isContinuousTraining) {
            this.stopContinuousTraining();
            this.startContinuousTraining();
        }
        
        console.log(`Training interval updated to ${this.trainingInterval}ms`);
    },

    // Initialize training interval from HTML input
    initializeFromUI() {
        const intervalInput = document.getElementById('training-interval');
        if (intervalInput) {
            this.trainingInterval = parseInt(intervalInput.value) || 1000;
        }
    },

    playTraining() {
        if (this.data.length === 0) {
            document.getElementById('error').innerHTML = 'No training data available. Generate or add training data first.';
            return;
        }
        
        if (!this.isContinuousTraining) {
            this.startContinuousTraining();
            this.updatePlayPauseButtons();
        }
    },

    pauseTraining() {
        if (this.isContinuousTraining) {
            this.stopContinuousTraining();
            this.updatePlayPauseButtons();
        }
    },

    updatePlayPauseButtons() {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (playBtn && pauseBtn) {
            if (this.isContinuousTraining) {
                playBtn.style.display = 'none';
                pauseBtn.style.display = 'inline-block';
            } else {
                playBtn.style.display = 'inline-block';
                pauseBtn.style.display = 'none';
            }
        }
    },
};

// Global functions for backward compatibility
function addData() {
    TrainingManager.addData();
}

function clearData() {
    TrainingManager.clearData();
}

function updateDataDisplay() {
    TrainingManager.updateDataDisplay();
}

function trainStep() {
    TrainingManager.trainStep();
}

function trainBatch() {
    TrainingManager.trainBatch();
}

function generateDataPoints() {
    TrainingManager.generateDataPoints();
}

function importTrainingData() {
    TrainingManager.importTrainingData();
}

// ...existing code...

function playTraining() {
    TrainingManager.playTraining();
}

function pauseTraining() {
    TrainingManager.pauseTraining();
}

// Update global data reference
Object.defineProperty(window, 'data', {
    get: () => TrainingManager.data,
    set: (value) => { TrainingManager.data = value; }
});
