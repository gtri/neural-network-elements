# Interactive Neural Network Visualization

An interactive web-based tool for visualizing and training multi-layer neural networks with real-time decision boundary analysis, polyhedral decomposition, and spectral graph theory applications.

## Features

### Core Functionality
- **Interactive Neural Network Builder**: Create custom architectures with configurable input, hidden, and output layers
- **Real-time Training**: Train networks with backpropagation and visualize loss curves
- **Weight & Bias Manipulation**: Fine-tune individual network parameters with sliders and numerical inputs
- **Save/Load Networks**: Export and import trained networks as JSON files

### Advanced Visualizations

#### 2D Decision Boundaries
- **Polyhedral Decomposition**: Visualize how ReLU networks partition input space into polyhedral regions (based on [this](https://proceedings.mlr.press/v221/liu23a.html) paper)
- **Binary Activation Patterns**: See the binary state vectors of hidden layer neurons
- **Interactive Controls**: Pan, zoom, and adjust resolution for detailed exploration
- **Neuron Highlighting**: Select specific neurons to see their activation regions

#### 3D Surface Visualization
- **Neural Function Surface**: View the network's output as a 3D surface for 2-input networks
- **Target Function Overlay**: Compare network output with mathematical target functions
- **Surface Mesh Controls**: Adjust tessellation resolution and normal tolerance
- **Interactive 3D Navigation**: Orbit, zoom, and pan using Three.js controls

#### Dual Graph Analysis
- **Graph Representation**: Automatic generation of dual graphs from decision regions
- **Spectral Analysis**: Compute eigenvalues and eigenvectors of graph Laplacians
- **Export Capabilities**: Save dual graphs as JSON or Python NetworkX code

### Training & Data Management
- **Manual Data Entry**: Add individual training points interactively
- **Function-based Generation**: Generate training data from mathematical expressions
- **Batch Training**: Train for multiple steps with customizable learning rates
- **Loss History**: Interactive loss curves with step-by-step network state restoration
- **Import/Export**: JSON-based data exchange for reproducible experiments

## Getting Started

### Prerequisites
- Modern web browser with HTML5 Canvas and WebGL support
- No installation required - runs entirely in the browser

### Usage

1. **Open the Application**
   ```bash
   # Serve locally (recommended)
   python -m http.server 8000
   # or
   npx serve .
   ```
   Then navigate to `http://localhost:8000/index.html`

2. **Quick Start**
   - Open `index.html` in your browser
   - Use the default 2-4-3-1 architecture or modify as needed
   - Click "Forward Pass" to see initial network state
   - Add training data points or generate from functions
   - Train the network and observe the visualizations

## Tutorials

Below are links to detailed tutorials covering various aspects of the application:

[1. Designing Networks](tutorial/1-designing-networks.md)


[2. Training Networks](tutorial/2-training-networks.md)


[3. Investigating the Polyhedral Decomposition](tutorial/3-polyhedral-decomp.md)

## File Structure

```
├── index.html              # Main application interface
├── interactive_relu.html   # Standalone version with all code inline
├── styles.css             # Application styling
├── script.js              # Main initialization and coordination
└── js/
    ├── network.js          # Core neural network implementation
    ├── network-visualization.js  # Interactive network diagram
    ├── decision-boundary.js      # 2D decision boundary plots
    ├── visualization-3d.js       # 3D surface visualization
    ├── dual-graph.js            # Dual graph generation and export
    ├── eigenvalue-computation.js # Spectral analysis algorithms
    ├── binary-display.js        # Binary state vector display
    ├── training.js             # Training algorithms and data management
    ├── loss-graph.js          # Interactive loss curve visualization
    ├── plot-manager.js        # Plot coordination and spectral analysis
    └── file-manager.js        # Save/load functionality
```

## Technical Details

### Neural Network Implementation
- **Architecture**: Fully connected feedforward networks with ReLU activation
- **Training**: Standard backpropagation with mean squared error loss
- **Precision**: All computations in JavaScript with configurable precision display

### Mathematical Foundations
- **Polyhedral Decomposition**: ReLU networks create piecewise linear functions that partition input space
- **Binary Encoding**: Each region corresponds to a unique binary activation pattern
- **Graph Theory**: Decision regions form a graph where edges connect adjacent polyhedra
- **Spectral Analysis**: Eigenvalues of the graph Laplacian reveal structural properties

### Dependencies
- **Three.js**: 3D visualization and WebGL rendering
- **MathJax**: Mathematical notation rendering
- **Numeric.js**: Eigenvalue computation for spectral analysis

## Interactive Controls

### Network Architecture
- **Input Size**: 1-10 neurons (2 recommended for full visualization features)
- **Hidden Layers**: Comma-separated sizes (e.g., "4,6,3")
- **Output Size**: 1-10 neurons (1 recommended for regression tasks)

### Visualization Modes
- **2D Plot**: Decision boundary visualization with polyhedral regions
- **3D Plot**: Surface visualization for 2-input, 1-output networks
- **Dual Graph**: Graph-theoretic representation of region adjacency

### Training Features
- **Learning Rate**: 0.001-1.0 (default: 0.01)
- **Training Speed**: Configurable interval for continuous training
- **Target Functions**: Mathematical expressions for automated data generation
- **Batch Operations**: Train single steps, 100 steps, or continuous training

## Research Applications

### Educational Use
- **Neural Network Fundamentals**: Understand how weights and biases affect network behavior
- **Visualization**: See abstract concepts like decision boundaries and activation patterns
- **Interactive Learning**: Experiment with different architectures and training data

### Research Applications
- **Polyhedral Analysis**: Study the geometric structure of ReLU networks
- **Spectral Graph Theory**: Analyze connectivity patterns in decision regions
- **Network Interpretability**: Understand how networks partition input space

## Customization

### Modifying Visualizations
- Edit `js/decision-boundary.js` for 2D plot customization
- Modify `js/visualization-3d.js` for 3D rendering options
- Adjust color schemes in the respective modules

### Adding New Features
- The modular architecture makes it easy to add new visualization types
- Each module is self-contained with clear APIs
- Global state management through `window.net` and event coordination

### Performance Tuning
- Adjust resolution settings for smoother real-time updates
- Modify tessellation parameters for 3D visualization quality
- Configure training intervals for optimal responsiveness



## Visualization Examples

### 2D Binary Classification
- Train on XOR-like patterns to see non-linear decision boundaries
- Observe how additional hidden layers create more complex regions
- Use neuron highlighting to understand individual neuron contributions

### Function Approximation
- Generate training data from mathematical functions like `x*x + y*y - 1.5`
- Watch the 3D surface evolve during training
- Compare network output with target function overlay

### Graph Analysis
- Examine the dual graph structure for different network architectures
- Compute spectral properties to understand connectivity

## Credits and Acknowledgements

This project was developed by **Andrew Tawfeek** ([atawfeek.com](https://atawfeek.com)) during work at the **Georgia Tech Research Institute (GTRI)** in the **CIPHER Lab** as part of the **Geometric Trust for AI** project, under the supervision of **Branden Stone**.

Special thanks goes to the other team members on the project: **Vicente Bosca**, **Tatum Rask**, and **Sunia Tanweer**.

This work was supported by the GTRI and the CIPHER Lab's mission to advance trustworthy AI through geometric and mathematical foundations.