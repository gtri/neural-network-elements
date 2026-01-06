// Dual Graph Module
const DualGraph = {
    render(dualCtx, nodes, edges) {
        // Draw dual graph
        dualCtx.lineWidth = 1.5;
        edges.forEach(edge => {
            const [id1, id2] = edge.split(',').map(Number);
            const n1 = nodes[id1];
            const n2 = nodes[id2];
            dualCtx.beginPath();
            dualCtx.moveTo(n1.x, n1.y);
            dualCtx.lineTo(n2.x, n2.y);
            dualCtx.strokeStyle = '#666';
            dualCtx.stroke();
        });
        
        // Draw nodes
        nodes.forEach(node => {
            dualCtx.beginPath();
            dualCtx.arc(node.x, node.y, 6, 0, 2 * Math.PI);
            dualCtx.fillStyle = node.color;
            dualCtx.fill();
            dualCtx.strokeStyle = '#000';
            dualCtx.lineWidth = 1.5;
            dualCtx.stroke();
        });
    },

    computeGraphLaplacian(nodes, edges) {
        const n = nodes.length;
        if (n === 0) return [];
        
        // Initialize adjacency matrix
        const adj = Array(n).fill().map(() => Array(n).fill(0));
        
        // Fill adjacency matrix
        edges.forEach(edge => {
            const [i, j] = edge.split(',').map(Number);
            if (i < n && j < n) {
                adj[i][j] = adj[j][i] = 1;
            }
        });
        
        // Compute degree matrix
        const deg = adj.map(row => row.reduce((a, b) => a + b, 0));
        
        // Compute Laplacian matrix
        const lap = Array(n).fill().map((_, i) => 
            Array(n).fill().map((_, j) => 
                i === j ? deg[i] : -adj[i][j]
            )
        );
        
        // Compute eigenvalues using the eigenvalue computation module
        try {
            const result = EigenvalueComputation.computeEigenvalues(lap);
            if (result.success) {
                return result.eigenvalues;
            } else {
                return [`Error: ${result.error}`];
            }
        } catch (error) {
            return [`Error: ${error.message}`];
        }
    },

    export(format) {
        if (!window.currentDualGraph || window.currentDualGraph.nodes.length === 0) {
            alert('No dual graph available to export. Please ensure 2D plots are visible.');
            return;
        }

        const { nodes, edges } = window.currentDualGraph;
        
        if (format === 'json') {
            // Create export data with comprehensive information
            const exportData = {
                metadata: {
                    networkArchitecture: window.net.architecture,
                    timestamp: new Date().toISOString(),
                    description: "Dual graph of neural network decision regions"
                },
                vertices: nodes.map(node => ({
                    id: node.id,
                    x: node.x,
                    y: node.y,
                    color: node.color
                })),
                edges: Array.from(edges).map(edge => {
                    const [id1, id2] = edge.split(',').map(Number);
                    return {
                        source: id1,
                        target: id2
                    };
                }),
                adjacencyList: (() => {
                    const adj = {};
                    nodes.forEach(node => adj[node.id] = []);
                    edges.forEach(edge => {
                        const [id1, id2] = edge.split(',').map(Number);
                        adj[id1].push(id2);
                        adj[id2].push(id1);
                    });
                    return adj;
                })()
            };

            // Create and download JSON file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dual_graph_${window.net.architecture.join('x')}_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'python') {
            // Create Python export
            const vertices = nodes.map(node => `[${node.id}, ${node.x.toFixed(2)}, ${node.y.toFixed(2)}, "${node.color}"]`);
            const edgeList = Array.from(edges).map(edge => {
                const [id1, id2] = edge.split(',').map(Number);
                return `[${id1}, ${id2}]`;
            });
            
            const pythonCode = `# Dual graph of neural network decision regions
# Network architecture: [${window.net.architecture.join(', ')}]
# Generated on: ${new Date().toISOString()}

# Vertices: [id, x, y, color]
vertices = [
    ${vertices.join(',\n    ')}
]

# Edges: [source, target]
edges = [
    ${edgeList.join(',\n    ')}
]

# Example usage:
# import matplotlib.pyplot as plt
# import networkx as nx
# 
# G = nx.Graph()
# for vertex in vertices:
#     G.add_node(vertex[0], pos=(vertex[1], vertex[2]), color=vertex[3])
# G.add_edges_from(edges)
# 
# pos = nx.get_node_attributes(G, 'pos')
# colors = [G.nodes[node]['color'] for node in G.nodes()]
# nx.draw(G, pos, node_color=colors, with_labels=True)
# plt.show()
`;

            // Create and download Python file
            const blob = new Blob([pythonCode], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dual_graph_${window.net.architecture.join('x')}_${new Date().toISOString().slice(0,10)}.py`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
};

// Global functions for backward compatibility
function computeGraphLaplacian(nodes, edges) {
    return DualGraph.computeGraphLaplacian(nodes, edges);
}

function exportDualGraph() {
    const format = document.getElementById('export-format').value;
    DualGraph.export(format);
}
