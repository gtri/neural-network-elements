// Binary Display Module
const BinaryDisplay = {
    // Configuration: Canvas size when loss graph is visible (change this value to adjust size)
    COMPACT_CANVAS_SIZE: 300,  // ← MODIFY THIS VALUE to change size when loss graph is active
    NORMAL_CANVAS_SIZE: 400,   // Normal size when no loss graph is present
    INPUT_2D_CANVAS_SIZE: 200, // ← MODIFY THIS VALUE to change size specifically for 2D input networks
    update() {
        const c = document.getElementById('binary-states');
        c.innerHTML = '';
        if (!window.net || !window.net.activations || window.net.activations.length === 0) return;
        
        let fullVector = [];
        
        // Show ONLY hidden layers (skip input and output)
        for (let l = 1; l < window.net.activations.length - 1; l++) {
            const div = document.createElement('div');
            div.className = 'binary-layer';
            
            const layerName = `Hidden ${l}`;
            
            const binaryVec = window.net.activations[l].map(neuron => neuron[0] > 0 ? 1 : 0);
            fullVector = fullVector.concat(binaryVec);
            div.innerHTML = `<div class="binary-title">${layerName}:</div><div class="binary-vector">[${binaryVec.join(', ')}]</div>`;
            c.appendChild(div);
        }
        
        const fullDiv = document.createElement('div');
        fullDiv.className = 'full-binary';
        
        // Check if there are highlighted neurons from the DecisionBoundary module
        let highlightedNeuronIndices = new Set();
        if (typeof DecisionBoundary !== 'undefined') {
            if (DecisionBoundary.highlightedNeurons && DecisionBoundary.highlightedNeurons.size > 0) {
                highlightedNeuronIndices = DecisionBoundary.highlightedNeurons;
            } else if (DecisionBoundary.highlightedNeuron !== null) {
                // Backward compatibility
                highlightedNeuronIndices.add(DecisionBoundary.highlightedNeuron);
            }
        }
        
        // Create the full vector display with highlighting
        let fullVectorHtml = '[';
        for (let i = 0; i < fullVector.length; i++) {
            if (highlightedNeuronIndices.has(i)) {
                // Make the highlighted neurons bold
                fullVectorHtml += `<strong style="background-color: #f39c12; color: white; padding: 1px 3px; border-radius: 2px;">${fullVector[i]}</strong>`;
            } else {
                fullVectorHtml += fullVector[i];
            }
            if (i < fullVector.length - 1) {
                fullVectorHtml += ', ';
            }
        }
        fullVectorHtml += ']';
        
        fullDiv.innerHTML = `<div class="full-binary-title">Full Network State:</div><div class="full-binary-vector">${fullVectorHtml}</div>`;
        c.appendChild(fullDiv);
        
        // Add neighboring states section
        this.addNeighboringStates(c, fullVector);
        
        // Add Graph Laplacian Spectrum section
        this.addSpectrumSection(c);
        
        // Update plot visibility
        this.updatePlotVisibility();
        
        // Store the current loss tracking status for future updates
        this.lastLossTrackingStatus = (typeof LossGraph !== 'undefined' && LossGraph.lossHistory && LossGraph.lossHistory.length > 0) ||
                                    (typeof window.data !== 'undefined' && window.data && window.data.length > 0) ||
                                    document.getElementById('error')?.innerHTML.includes('Loss:');
    },

    addNeighboringStates(container, currentState) {
        const neighborsDiv = document.createElement('div');
        neighborsDiv.className = 'neighboring-states';
        neighborsDiv.style.marginTop = '15px';
        neighborsDiv.style.paddingTop = '15px';
        neighborsDiv.style.borderTop = '2px solid #e0e0e0';
        
        // Find all neighboring states (Hamming distance = 1)
        const neighbors = this.findNeighboringStates(currentState);
        
        let neighborsHtml = `
            <div style="font-weight: bold; color: #2c3e50; margin-bottom: 6px; font-size:14px;">
                Neighboring States:
            </div>
        `;
        
        if (neighbors.length === 0) {
            neighborsHtml += `<div style="font-style: italic; color: #666;">No neighboring regions found</div>`;
        } else {
            const isFrom2D = window.net.architecture[0] === 2 && window.currentDualGraph;
            neighborsHtml += `<div style="margin-bottom: 5px; font-size: 12px; color: #666;">Found ${neighbors.length} neighboring region(s):</div>`;
            
            neighbors.forEach((neighbor, index) => {
                const diffPos = this.findDifference(currentState, neighbor.state);
                let neighborDescription = '';
                
                if (isFrom2D && neighbor.regionId !== undefined) {
                    // Neighbor from dual graph (2D input case)
                    neighborDescription = `
                        <div style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                            <div style="font-weight: 500;">Region ${neighbor.regionId}: [${neighbor.state.join(', ')}]</div>
                            <div style="color: #666; font-size: 11px;">Differs at neuron ${diffPos} (${currentState[diffPos]} → ${neighbor.state[diffPos]})</div>
                        </div>
                    `;
                } else if (neighbor.inputIndex !== undefined) {
                    // Neighbor from input variation (non-2D input case)
                    neighborDescription = `
                        <div style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                            <div style="font-weight: 500;">Neighbor ${index + 1}: [${neighbor.state.join(', ')}]</div>
                            <div style="color: #666; font-size: 11px;">
                                Reached by varying input ${neighbor.inputIndex + 1} by ${neighbor.inputVariation > 0 ? '+' : ''}${neighbor.inputVariation}
                            </div>
                            <div style="color: #666; font-size: 11px;">
                                Test inputs: [${neighbor.testInputs.map(v => v.toFixed(3)).join(', ')}]
                            </div>
                            <div style="color: #666; font-size: 11px;">Differs at neuron ${diffPos} (${currentState[diffPos]} → ${neighbor.state[diffPos]})</div>
                        </div>
                    `;
                } else {
                    // Fallback
                    neighborDescription = `
                        <div style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                            <div style="font-weight: 500;">Neighbor ${index + 1}: [${neighbor.state.join(', ')}]</div>
                            <div style="color: #666; font-size: 11px;">Differs at neuron ${diffPos} (${currentState[diffPos]} → ${neighbor.state[diffPos]})</div>
                        </div>
                    `;
                }
                
                neighborsHtml += neighborDescription;
            });
        }
        
        neighborsDiv.innerHTML = neighborsHtml;
        container.appendChild(neighborsDiv);
    },

    findNeighboringStates(currentState) {
        // If we have a complete dual graph, use it for finding neighbors
        if (window.currentDualGraph && window.currentDualGraph.nodes && window.currentDualGraph.edges && window.currentDualGraph.nodes.length > 1) {
            return this.findNeighborsFromDualGraph(currentState);
        }
        
        // For 2D inputs, use the decision boundary dual graph if available
        if (window.net.architecture[0] === 2 && window.currentDualGraph && window.currentDualGraph.nodes && window.currentDualGraph.edges) {
            return this.findNeighborsFromDualGraph(currentState);
        }
        
        // For all other cases, compute neighbors by varying input values
        return this.findNeighborsByInputVariation(currentState);
    },

    findNeighborsFromDualGraph(currentState) {
        const neighbors = [];
        const currentStateStr = currentState.join(',');
        
        // Find the current region in the dual graph
        let currentRegionId = -1;
        for (const node of window.currentDualGraph.nodes) {
            if (node.state === currentStateStr) {
                currentRegionId = node.id;
                break;
            }
        }
        
        if (currentRegionId === -1) {
            return []; // Current state not found in dual graph
        }
        
        // Find all edges connected to the current region
        const connectedRegionIds = new Set();
        for (const edgeStr of window.currentDualGraph.edges) {
            const [id1, id2] = edgeStr.split(',').map(Number);
            if (id1 === currentRegionId) {
                connectedRegionIds.add(id2);
            } else if (id2 === currentRegionId) {
                connectedRegionIds.add(id1);
            }
        }
        
        // Get the states of connected regions
        for (const regionId of connectedRegionIds) {
            const neighborNode = window.currentDualGraph.nodes.find(node => node.id === regionId);
            if (neighborNode && neighborNode.state) {
                const neighborState = neighborNode.state.split(',').map(Number);
                neighbors.push({
                    state: neighborState,
                    regionId: regionId
                });
            }
        }
        
        return neighbors;
    },

    findNeighborsByInputVariation(currentState) {
        if (!window.net) return [];
        
        const neighbors = [];
        const inputSize = window.net.architecture[0];
        
        // Get current input values from the UI
        const currentInputs = [];
        for (let i = 0; i < inputSize; i++) {
            const inputElement = document.getElementById(`input-${i}`);
            if (inputElement) {
                currentInputs.push(parseFloat(inputElement.value) || 0);
            }
        }
        
        if (currentInputs.length !== inputSize) {
            return []; // Unable to get input values
        }
        
        // Try small variations in each input dimension
        const variations = [-0.1, -0.05, -0.01, 0.01, 0.05, 0.1];
        
        for (let inputIdx = 0; inputIdx < inputSize; inputIdx++) {
            for (const variation of variations) {
                const testInputs = [...currentInputs];
                testInputs[inputIdx] += variation;
                
                // Forward pass with test inputs
                const testOutput = window.net.forward(testInputs);
                
                // Get network state from hidden layers only using getBinaryState method
                const testState = window.net.getBinaryState();
                
                // Check if this state is different from current state and has Hamming distance = 1
                const hammingDistance = this.calculateHammingDistance(currentState, testState);
                if (hammingDistance === 1) {
                    // Check if we already have this neighbor
                    const stateStr = testState.join(',');
                    const exists = neighbors.some(n => n.state.join(',') === stateStr);
                    
                    if (!exists) {
                        neighbors.push({
                            state: testState,
                            inputIndex: inputIdx,
                            inputVariation: variation,
                            testInputs: [...testInputs]
                        });
                    }
                }
            }
        }
        
        // Restore original input state
        window.net.forward(currentInputs);
        
        return neighbors;
    },

    calculateHammingDistance(state1, state2) {
        if (state1.length !== state2.length) return Infinity;
        
        let distance = 0;
        for (let i = 0; i < state1.length; i++) {
            if (state1[i] !== state2[i]) {
                distance++;
            }
        }
        return distance;
    },

    findDifference(state1, state2) {
        for (let i = 0; i < state1.length; i++) {
            if (state1[i] !== state2[i]) {
                return i;
            }
        }
        return -1;
    },

    addSpectrumSection(container) {
        const spectrumDiv = document.createElement('div');
        spectrumDiv.id = 'spectrum-section';
        spectrumDiv.style.marginTop = '15px';
        spectrumDiv.style.paddingTop = '15px';
        spectrumDiv.style.borderTop = '2px solid #e0e0e0';
        spectrumDiv.innerHTML = `
            <div style="font-weight: bold; color: #2c3e50; margin-bottom: 6px; font-size:14px;">
                Graph Laplacian Spectrum:
            </div>
            <div id="eigenvalues-display" style="font-family: monospace; font-size: 13px; color: #333; margin-bottom: 10px;"></div>
            <div style="display: flex; gap: 5px;">
                <button onclick="computeSpectrum()" style="font-size: 12px; padding: 4px 8px;">Compute Spectrum</button>
            </div>
        `;
        container.appendChild(spectrumDiv);
    },

    updatePlotVisibility() {
        const plotContainer = document.getElementById('plot-container');
        const plot3dContainer = document.getElementById('3d-plot-container');
        
        // Always show the plot container if it exists (for 2D networks with decision boundaries)
        if (window.net.architecture[0] === 2 && window.net.architecture[window.net.architecture.length-1] === 1) {
            if (plotContainer && plotContainer.parentElement) {
                plotContainer.parentElement.style.display = 'block';
                const switch_el = document.getElementById('plot-type-switch');
                if (switch_el && switch_el.classList.contains('active')) {
                    plotContainer.style.display = 'none';
                    plot3dContainer.style.display = 'block';
                    if (typeof Visualization3D !== 'undefined') {
                        Visualization3D.update();
                    }
                } else {
                    plotContainer.style.display = 'block';
                    plot3dContainer.style.display = 'none';
                    if (typeof DecisionBoundary !== 'undefined') {
                        DecisionBoundary.update();
                    }
                }
            }
        } else if (plotContainer && plotContainer.parentElement) {
            // For non-2D networks, hide the decision boundary plots
            plotContainer.parentElement.style.display = 'none';
        }
    }
};

// Global function for backward compatibility
function updateBinaryDisplay() {
    BinaryDisplay.update();
}
