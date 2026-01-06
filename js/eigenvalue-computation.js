/**
 * Eigenvalue Computation Module
 * Handles eigenvalue and eigenvector computation for graph Laplacian matrices
 */

const EigenvalueComputation = {
    
    /**
     * Compute eigenvalues of a symmetric matrix
     */
    computeEigenvalues(matrix) {
        const n = matrix.length;
        
        if (n === 0) {
            return { eigenvalues: [], success: false, error: 'Empty matrix' };
        }
        
        // Validate matrix is square
        if (!matrix.every(row => row.length === n)) {
            return { eigenvalues: [], success: false, error: 'Matrix is not square' };
        }
        
        try {
            // For small matrices, use direct computation
            if (n === 1) {
                return { eigenvalues: [matrix[0][0]], success: true };
            }
            
            if (n === 2) {
                const eigenvalues = this.computeEigenvalues2x2(matrix);
                return { eigenvalues, success: true };
            }
            
            // For larger matrices, use numeric.js
            if (typeof numeric !== 'undefined') {
                return this.computeEigenvaluesNumeric(matrix);
            } else {
                return { 
                    eigenvalues: [], 
                    success: false, 
                    error: 'Numeric.js required for matrices larger than 2x2' 
                };
            }
            
        } catch (error) {
            console.error('Eigenvalue computation error:', error);
            return { 
                eigenvalues: [], 
                success: false, 
                error: error.message 
            };
        }
    },
    
    /**
     * Compute eigenvalues and eigenvectors using numeric.js
     */
    computeEigendecomposition(matrix) {
        const n = matrix.length;
        
        if (n === 0) {
            return { eigenvalues: [], eigenvectors: [], success: false, error: 'Empty matrix' };
        }
        
        if (typeof numeric === 'undefined') {
            return { 
                eigenvalues: [], 
                eigenvectors: [], 
                success: false, 
                error: 'Numeric.js required for eigenvector computation' 
            };
        }
        
        try {
            console.log('Computing eigendecomposition for matrix size:', n + 'x' + n);
            
            const eigenResult = numeric.eig(matrix);
            console.log('Raw numeric.js result structure:', {
                hasLambda: !!eigenResult.lambda,
                hasE: !!eigenResult.E,
                lambdaType: typeof eigenResult.lambda,
                EType: typeof eigenResult.E
            });
            
            if (!eigenResult) {
                return { 
                    eigenvalues: [], 
                    eigenvectors: [], 
                    success: false, 
                    error: 'Numeric.js returned null result' 
                };
            }
            
            // Extract eigenvalues
            const eigenvalueResult = this.extractEigenvalues(eigenResult);
            if (!eigenvalueResult.success) {
                return {
                    eigenvalues: [],
                    eigenvectors: [],
                    success: false,
                    error: eigenvalueResult.error
                };
            }
            
            // Extract eigenvectors
            const eigenvectorResult = this.extractEigenvectors(eigenResult);
            if (!eigenvectorResult.success) {
                return {
                    eigenvalues: eigenvalueResult.eigenvalues,
                    eigenvectors: [],
                    success: false,
                    error: eigenvectorResult.error
                };
            }
            
            return { 
                eigenvalues: eigenvalueResult.eigenvalues, 
                eigenvectors: eigenvectorResult.eigenvectors, 
                success: true 
            };
            
        } catch (error) {
            console.error('Eigendecomposition error:', error);
            return { 
                eigenvalues: [], 
                eigenvectors: [], 
                success: false, 
                error: error.message 
            };
        }
    },
    
    /**
     * Extract eigenvalues from numeric.js result with robust format handling
     */
    extractEigenvalues(eigenResult) {
        if (!eigenResult.lambda) {
            return { eigenvalues: [], success: false, error: 'No lambda property in result' };
        }
        
        console.log('Lambda structure:', {
            type: typeof eigenResult.lambda,
            isArray: Array.isArray(eigenResult.lambda),
            keys: typeof eigenResult.lambda === 'object' ? Object.keys(eigenResult.lambda) : [],
            hasReal: eigenResult.lambda.real !== undefined,
            hasImag: eigenResult.lambda.imag !== undefined
        });
        
        let eigenvalues = [];
        
        try {
            // Case 1: Complex eigenvalues with real/imaginary parts
            if (eigenResult.lambda.real && Array.isArray(eigenResult.lambda.real)) {
                console.log('Using lambda.real array format');
                eigenvalues = eigenResult.lambda.real.slice();
            }
            // Case 2: Direct array of eigenvalues
            else if (Array.isArray(eigenResult.lambda)) {
                console.log('Using direct lambda array format');
                eigenvalues = eigenResult.lambda.map(val => {
                    if (typeof val === 'number') return val;
                    if (val && typeof val.real === 'number') return val.real;
                    const parsed = parseFloat(val);
                    return isNaN(parsed) ? 0 : parsed;
                });
            }
            // Case 3: Single eigenvalue
            else if (typeof eigenResult.lambda === 'number') {
                console.log('Using scalar lambda format');
                eigenvalues = [eigenResult.lambda];
            }
            // Case 4: Object with real property (single value)
            else if (eigenResult.lambda.real !== undefined && typeof eigenResult.lambda.real === 'number') {
                console.log('Using lambda.real scalar format');
                eigenvalues = [eigenResult.lambda.real];
            }
            // Case 5: Try to find numeric arrays in the lambda object
            else if (typeof eigenResult.lambda === 'object') {
                console.log('Searching for numeric arrays in lambda object');
                for (const [key, value] of Object.entries(eigenResult.lambda)) {
                    if (Array.isArray(value) && value.length > 0) {
                        // Check if it's an array of numbers
                        const firstVal = value[0];
                        if (typeof firstVal === 'number') {
                            console.log(`Found numeric array in lambda.${key}`);
                            eigenvalues = value.slice();
                            break;
                        }
                        // Check if it's an array of complex numbers
                        else if (firstVal && typeof firstVal.real === 'number') {
                            console.log(`Found complex array in lambda.${key}, extracting real parts`);
                            eigenvalues = value.map(v => v.real);
                            break;
                        }
                    }
                }
            }
            
            if (eigenvalues.length === 0) {
                return { 
                    eigenvalues: [], 
                    success: false, 
                    error: `Could not extract eigenvalues. Lambda format: ${JSON.stringify(eigenResult.lambda)}` 
                };
            }
            
            // Process and clean eigenvalues
            const processedEigenvalues = eigenvalues
                .filter(val => typeof val === 'number' && Number.isFinite(val))
                .map(val => Math.abs(val) < 1e-10 ? 0 : parseFloat(val.toFixed(6)))
                .sort((a, b) => a - b);
            
            console.log('Successfully extracted eigenvalues:', processedEigenvalues);
            
            return { eigenvalues: processedEigenvalues, success: true };
            
        } catch (error) {
            return { 
                eigenvalues: [], 
                success: false, 
                error: `Error extracting eigenvalues: ${error.message}` 
            };
        }
    },
    
    /**
     * Extract eigenvectors from numeric.js result
     */
    extractEigenvectors(eigenResult) {
        if (!eigenResult.E) {
            return { eigenvectors: [], success: false, error: 'No E property in result' };
        }
        
        console.log('E structure:', {
            type: typeof eigenResult.E,
            isArray: Array.isArray(eigenResult.E),
            keys: typeof eigenResult.E === 'object' ? Object.keys(eigenResult.E) : []
        });
        
        let eigenvectors = [];
        
        try {
            // Case 1: E.x format (most common)
            if (eigenResult.E.x && Array.isArray(eigenResult.E.x)) {
                console.log('Using E.x format');
                eigenvectors = eigenResult.E.x;
            }
            // Case 2: Direct array format
            else if (Array.isArray(eigenResult.E)) {
                console.log('Using direct E array format');
                eigenvectors = eigenResult.E;
            }
            // Case 3: Search for matrix in E object
            else if (typeof eigenResult.E === 'object') {
                console.log('Searching for matrix in E object');
                for (const [key, value] of Object.entries(eigenResult.E)) {
                    if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
                        console.log(`Found matrix in E.${key}`);
                        eigenvectors = value;
                        break;
                    }
                }
            }
            
            if (eigenvectors.length === 0) {
                return { 
                    eigenvectors: [], 
                    success: false, 
                    error: 'Could not extract eigenvectors from result' 
                };
            }
            
            console.log('Successfully extracted eigenvectors, shape:', eigenvectors.length + 'x' + eigenvectors[0]?.length);
            
            return { eigenvectors, success: true };
            
        } catch (error) {
            return { 
                eigenvectors: [], 
                success: false, 
                error: `Error extracting eigenvectors: ${error.message}` 
            };
        }
    },
    
    /**
     * Compute eigenvalues using numeric.js
     */
    computeEigenvaluesNumeric(matrix) {
        try {
            console.log('Using numeric.js for eigenvalue computation...');
            
            const eigenResult = numeric.eig(matrix);
            if (!eigenResult) {
                return { 
                    eigenvalues: [], 
                    success: false, 
                    error: 'Numeric.js returned null result' 
                };
            }
            
            return this.extractEigenvalues(eigenResult);
            
        } catch (error) {
            console.error('Numeric.js eigenvalue computation failed:', error);
            return { 
                eigenvalues: [], 
                success: false, 
                error: error.message 
            };
        }
    },
    
    /**
     * Compute eigenvalues for 2x2 matrix analytically
     */
    computeEigenvalues2x2(matrix) {
        const a = matrix[0][0], b = matrix[0][1];
        const c = matrix[1][0], d = matrix[1][1];
        
        const trace = a + d;
        const det = a * d - b * c;
        const discriminant = trace * trace - 4 * det;
        
        if (discriminant >= 0) {
            const sqrt_disc = Math.sqrt(discriminant);
            return [
                (trace + sqrt_disc) / 2,
                (trace - sqrt_disc) / 2
            ].sort((a, b) => a - b);
        } else {
            // Complex eigenvalues - return real parts
            return [trace / 2, trace / 2];
        }
    },
    
    /**
     * Build adjacency matrix from dual graph
     */
    buildAdjacencyMatrix(nodes, edges) {
        const n = nodes.length;
        const adj = Array(n).fill().map(() => Array(n).fill(0));
        
        const cleanEdges = edges.map(edgeStr => {
            const [id1, id2] = edgeStr.split(',').map(Number);
            return [id1, id2];
        });
        
        cleanEdges.forEach(([i, j]) => {
            if (i < n && j < n && i !== j) {
                adj[i][j] = 1;
                adj[j][i] = 1;
            }
        });
        
        return adj;
    },
    
    /**
     * Build Laplacian matrix from adjacency matrix
     */
    buildLaplacianMatrix(adjacencyMatrix) {
        const n = adjacencyMatrix.length;
        
        // Compute degrees
        const degrees = adjacencyMatrix.map(row => row.reduce((sum, val) => sum + val, 0));
        
        // Build Laplacian: L[i][j] = degree[i] if i==j, -adjacency[i][j] otherwise
        const laplacian = Array(n).fill().map((_, i) => 
            Array(n).fill().map((_, j) => {
                if (i === j) {
                    return degrees[i];
                } else {
                    return -adjacencyMatrix[i][j];
                }
            })
        );
        
        return laplacian;
    }
};

// Export for use in other modules
window.EigenvalueComputation = EigenvalueComputation;
