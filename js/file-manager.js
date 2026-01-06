// File I/O and Save/Load Module
const FileManager = {
    saveNet() {
        const save = {
            architecture: window.net.architecture,
            weights: window.net.weights,
            biases: window.net.biases,
            data: TrainingManager.data
        };
        
        // Custom formatter to match the compact style
        const formatCompactJSON = (obj) => {
            const formatArray = (arr, depth = 0) => {
                const indent = '  '.repeat(depth);
                const nextIndent = '  '.repeat(depth + 1);
                
                // For simple arrays (numbers only), keep them on one line
                if (arr.every(item => typeof item === 'number')) {
                    return '[' + arr.join(', ') + ']';
                }
                
                // For arrays of arrays, format each sub-array compactly
                const items = arr.map(item => {
                    if (Array.isArray(item)) {
                        return nextIndent + formatArray(item, depth + 1);
                    }
                    return nextIndent + JSON.stringify(item);
                });
                
                return '[\n' + items.join(',\n') + '\n' + indent + ']';
            };
            
            const parts = [];
            parts.push('  "architecture": ' + formatArray(obj.architecture, 1) + ',');
            parts.push('  "weights": ' + formatArray(obj.weights, 1) + ',');
            parts.push('  "biases": ' + formatArray(obj.biases, 1) + ',');
            parts.push('  "data": ' + JSON.stringify(obj.data));
            
            return '{\n' + parts.join('\n') + '\n}';
        };
        
        const formattedJSON = formatCompactJSON(save);
        const blob = new Blob([formattedJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'multilayer_network.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    loadNet(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const save = JSON.parse(e.target.result);
                document.getElementById('input-size').value = save.architecture[0];
                document.getElementById('hidden-layers').value = save.architecture.slice(1, -1).join(',');
                document.getElementById('output-size').value = save.architecture[save.architecture.length - 1];
                window.net = new MultiLayerNetwork(save.architecture);
                window.net.weights = save.weights;
                window.net.biases = save.biases;
                TrainingManager.data = save.data || [];
                createInputs();
                createWeights();
                TrainingManager.updateDataDisplay();
                forward();
            } catch (err) { 
                alert('Error loading file: ' + err.message); 
            }
        };
        reader.readAsText(file);
    }
};

// Global functions for backward compatibility
function saveNet() {
    FileManager.saveNet();
}

function loadNet(e) {
    FileManager.loadNet(e);
}
