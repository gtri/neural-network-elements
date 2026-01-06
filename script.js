// Main Application Initialization Script
// This file coordinates all the modular components

// Global variables shared across modules
window.net = null;
window.data = [];

// Main initialization function
function initializeApplication() {
    try {
        console.log('Starting application initialization...');
        
        // Initialize modules that have init methods
        if (typeof NetworkVisualization !== 'undefined' && NetworkVisualization.init) {
            console.log('Initializing NetworkVisualization...');
            const success = NetworkVisualization.init();
            if (!success) {
                console.error('Failed to initialize NetworkVisualization');
            }
        }
        
        if (typeof DecisionBoundary !== 'undefined' && DecisionBoundary.init) {
            console.log('Initializing DecisionBoundary...');
            const success = DecisionBoundary.init();
            if (!success) {
                console.error('Failed to initialize DecisionBoundary');
            }
        }
        
        if (typeof Visualization3D !== 'undefined' && Visualization3D.init) {
            console.log('Initializing Visualization3D...');
            const success = Visualization3D.init();
            if (!success) {
                console.error('Failed to initialize Visualization3D');
            }
        }
        
        // Initialize TrainingManager
        if (typeof TrainingManager !== 'undefined' && TrainingManager.initializeFromUI) {
            console.log('Initializing TrainingManager...');
            TrainingManager.initializeFromUI();
        }
        
        if (typeof LossGraph !== 'undefined' && LossGraph.init) {
            console.log('Initializing LossGraph...');
            const success = LossGraph.init();
            if (!success) {
                console.error('Failed to initialize LossGraph');
            }
        }
        
        // Other modules don't need initialization
        console.log('Other modules ready: DualGraph, BinaryDisplay, FileManager, PlotManager');
        
        // Create initial network (this function is defined in network.js)
        console.log('Creating initial network...');
        if (typeof createNetwork === 'function') {
            createNetwork();
        } else {
            console.error('createNetwork function not found!');
        }
        
        console.log('Application initialization complete.');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApplication);

// Zoom control functions for UI integration
function setZoomFromSlider(value) {
    const zoomLevel = parseFloat(value) / 100;
    if (typeof NetworkVisualization !== 'undefined' && NetworkVisualization.setZoom) {
        NetworkVisualization.setZoom(zoomLevel);
    }
}

// Update zoom slider when zoom changes programmatically
function updateZoomSlider(zoomLevel) {
    const slider = document.getElementById('zoom-slider');
    if (slider) {
        slider.value = Math.round(zoomLevel * 100);
    }
}
