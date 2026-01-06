// Plot Management and Spectrum Analysis Module
const PlotManager = {
    initialize() {
        // Initialize resolution value
        document.getElementById('resolution-value').textContent = 
            document.getElementById('plot-resolution').value;
    },

    updateResolution(value) {
        document.getElementById('resolution-value').textContent = value;
        DecisionBoundary.update();
    },

    updatePlotLayout() {
        const layout = document.getElementById('plot-layout').value;
        const container = document.querySelector('.plot-layout');
        container.className = `plot-layout ${layout}`;
    },

    togglePlotType() {
        const switch_el = document.getElementById('plot-type-switch');
        const label = document.getElementById('plot-type-label');
        const plot2d = document.getElementById('plot-container');
        const plot3d = document.getElementById('3d-plot-container');
        
        if (switch_el.classList.contains('active')) {
            switch_el.classList.remove('active');
            label.textContent = '2D Plot';
            plot2d.style.display = 'block';
            plot3d.style.display = 'none';
            DecisionBoundary.update();
        } else {
            switch_el.classList.add('active');
            label.textContent = '3D Plot';
            plot2d.style.display = 'none';
            plot3d.style.display = 'block';
            
            // Give the browser a moment to render the container with proper dimensions
            setTimeout(() => {
                if (typeof Visualization3D !== 'undefined') {
                    Visualization3D.resize();
                    Visualization3D.update();
                }
            }, 100);
        }
    }
};

// Spectrum Analysis Module
const SpectrumAnalysis = {
    computeSpectrum() {
        if (!window.currentDualGraph || window.currentDualGraph.nodes.length === 0) {
            document.getElementById('eigenvalues-display').textContent = 'No dual graph available. Please ensure 2D plots are visible.';
            return;
        }

        const { nodes, edges } = window.currentDualGraph;
        const n = nodes.length;
        
        if (n === 0) {
            document.getElementById('eigenvalues-display').textContent = 'No nodes in dual graph.';
            return;
        }
        
        console.log('Computing spectrum for dual graph with', n, 'nodes and', edges.length, 'edges');
        
        try {
            // Use the eigenvalue computation module
            const adjacencyMatrix = EigenvalueComputation.buildAdjacencyMatrix(nodes, edges);
            const laplacianMatrix = EigenvalueComputation.buildLaplacianMatrix(adjacencyMatrix);
            
            console.log('Adjacency matrix:', adjacencyMatrix);
            console.log('Laplacian matrix:', laplacianMatrix);
            
            const result = EigenvalueComputation.computeEigenvalues(laplacianMatrix);
            
            if (result.success) {
                const eigenvalues = result.eigenvalues;
                console.log('Successfully computed eigenvalues:', eigenvalues);
                
                let displayText = `[${eigenvalues.map(val => val.toFixed(3)).join(', ')}]`;
                if (result.isApproximation) {
                    displayText = `[Approx: ${eigenvalues.map(val => val.toFixed(3)).join(', ')}]`;
                }
                
                document.getElementById('eigenvalues-display').textContent = displayText;
            } else {
                console.error('Eigenvalue computation failed:', result.error);
                document.getElementById('eigenvalues-display').textContent = result.error || 'No valid eigenvalues computed.';
            }
            
        } catch (error) {
            console.error('Spectrum computation failed:', error);
            document.getElementById('eigenvalues-display').textContent = `Computation error: ${error.message}`;
        }
    },

    fiedlerPartition() {
        if (!window.currentDualGraph || window.currentDualGraph.nodes.length === 0) {
            document.getElementById('eigenvalues-display').textContent = 'No dual graph available. Please ensure 2D plots are visible.';
            return;
        }

        const { nodes, edges } = window.currentDualGraph;
        const n = nodes.length;
        
        if (n < 2) {
            document.getElementById('eigenvalues-display').textContent = 'Need at least 2 nodes for Fiedler partition.';
            return;
        }

        try {
            console.log('Computing Fiedler partition for dual graph with', n, 'nodes');
            
            // Use the eigenvalue computation module
            const adjacencyMatrix = EigenvalueComputation.buildAdjacencyMatrix(nodes, edges);
            const laplacianMatrix = EigenvalueComputation.buildLaplacianMatrix(adjacencyMatrix);
            
            console.log('Adjacency matrix:', adjacencyMatrix);
            console.log('Laplacian matrix:', laplacianMatrix);
            
            // Compute eigendecomposition
            const result = EigenvalueComputation.computeEigendecomposition(laplacianMatrix);
            
            if (!result.success) {
                document.getElementById('eigenvalues-display').textContent = result.error || 'Failed to compute eigenvectors.';
                return;
            }

            const { eigenvalues, eigenvectors } = result;
            console.log('Eigenvalues:', eigenvalues);
            console.log('Eigenvectors shape:', eigenvectors.length, 'x', eigenvectors[0]?.length);

            // Create array of (eigenvalue, index) pairs and sort by eigenvalue
            const eigenPairs = eigenvalues.map((val, idx) => ({ value: val, index: idx }))
                .sort((a, b) => a.value - b.value);

            if (eigenPairs.length < 2) {
                document.getElementById('eigenvalues-display').textContent = 'Need at least 2 eigenvalues.';
                return;
            }

            // Get the Fiedler vector (eigenvector of second smallest eigenvalue)
            const fiedlerIndex = eigenPairs[1].index;
            const fiedlerVector = eigenvectors.map(row => row[fiedlerIndex]);

            console.log('Fiedler vector:', fiedlerVector);

            // Partition nodes based on sign of Fiedler vector
            const partition1 = [];
            const partition2 = [];

            fiedlerVector.forEach((value, i) => {
                if (value >= 0) {
                    partition1.push(i);
                } else {
                    partition2.push(i);
                }
            });

            console.log('Partition 1 (≥0):', partition1);
            console.log('Partition 2 (<0):', partition2);

            // Update dual graph visualization with partition colors
            this.visualizeFiedlerPartition(partition1, partition2, fiedlerVector);

            // Display results
            const lambda2 = eigenPairs[1].value;
            document.getElementById('eigenvalues-display').innerHTML = 
                `<div>Fiedler value (λ₂): ${lambda2.toFixed(4)}</div>
                 <div>Partition 1 (blue): ${partition1.length} nodes</div>
                 <div>Partition 2 (red): ${partition2.length} nodes</div>
                 <div>Fiedler vector: [${fiedlerVector.map(v => v.toFixed(3)).join(', ')}]</div>`;

        } catch (error) {
            console.error('Fiedler partition failed:', error);
            document.getElementById('eigenvalues-display').textContent = `Partition error: ${error.message}`;
        }
    },

    visualizeFiedlerPartition(partition1, partition2, fiedlerVector) {
        // Get the dual graph canvas and redraw with partition colors
        const dualCanvas = document.getElementById('dual-graph-canvas');
        if (!dualCanvas) return;

        const ctx = dualCanvas.getContext('2d');
        ctx.clearRect(0, 0, 300, 300);

        const { nodes, edges } = window.currentDualGraph;

        // Draw edges first
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        edges.forEach(edgeStr => {
            const [id1, id2] = edgeStr.split(',').map(Number);
            const n1 = nodes[id1];
            const n2 = nodes[id2];
            if (n1 && n2) {
                ctx.beginPath();
                ctx.moveTo(n1.x, n1.y);
                ctx.lineTo(n2.x, n2.y);
                ctx.stroke();
            }
        });

        // Draw nodes with partition colors
        nodes.forEach((node, i) => {
            const isPartition1 = partition1.includes(i);
            const fiedlerValue = fiedlerVector[i];
            
            // Color intensity based on Fiedler vector magnitude
            const intensity = Math.min(Math.abs(fiedlerValue) * 2, 1);
            
            if (isPartition1) {
                // Blue for positive Fiedler values
                const blue = Math.floor(255 * intensity);
                ctx.fillStyle = `rgb(${255 - blue}, ${255 - blue}, 255)`;
            } else {
                // Red for negative Fiedler values  
                const red = Math.floor(255 * intensity);
                ctx.fillStyle = `rgb(255, ${255 - red}, ${255 - red})`;
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw node border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw node ID
            ctx.fillStyle = '#000';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(node.id.toString(), node.x, node.y + 3);
        });
    }
};

// Global functions for backward compatibility
function initializePlot() {
    PlotManager.initialize();
}

function updateResolution(value) {
    PlotManager.updateResolution(value);
}

function updatePlotLayout() {
    PlotManager.updatePlotLayout();
}

function togglePlotType() {
    PlotManager.togglePlotType();
}

// Global wrapper functions for onclick handlers
function computeSpectrum() {
    SpectrumAnalysis.computeSpectrum();
}

function fiedlerPartition() {
    SpectrumAnalysis.fiedlerPartition();
}
