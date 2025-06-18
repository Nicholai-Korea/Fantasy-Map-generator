class VoronoiHelper {
    constructor() {
        try {
            this.delaunay = null;
            this.voronoi = null;
            
            // Check if d3 is available
            if (typeof d3 === 'undefined') {
                console.error("d3.js library is not loaded! This is required for Voronoi generation.");
                throw new Error("d3.js is not available");
            }
            
            console.log("VoronoiHelper initialized successfully");
        } catch (error) {
            console.error("Error initializing VoronoiHelper:", error);
            throw error;
        }
    }

    // Generate Voronoi diagram from points
    generateVoronoi(points, width, height) {
        try {
            console.log(`Generating Voronoi with ${points.length} points`);
            
            // Validate points
            if (!points || points.length < 3) {
                console.error("Not enough points to generate Voronoi diagram");
                return null;
            }
            
            // Check for NaN values in points
            const hasInvalidPoints = points.some(p => 
                isNaN(p[0]) || isNaN(p[1]) || 
                p[0] < 0 || p[0] > width || 
                p[1] < 0 || p[1] > height
            );
            
            if (hasInvalidPoints) {
                console.error("Invalid points detected in Voronoi generation");
                // Filter out invalid points
                points = points.filter(p => 
                    !isNaN(p[0]) && !isNaN(p[1]) && 
                    p[0] >= 0 && p[0] <= width && 
                    p[1] >= 0 && p[1] <= height
                );
                
                if (points.length < 3) {
                    console.error("Not enough valid points after filtering");
                    return null;
                }
            }
            
            this.delaunay = d3.Delaunay.from(points);
            this.voronoi = this.delaunay.voronoi([0, 0, width, height]);
            return this.voronoi;
        } catch (error) {
            console.error("Error generating Voronoi diagram:", error);
            return null;
        }
    }

    // Apply Lloyd relaxation to smooth cell shapes
    applyLloydRelaxation(points, width, height, iterations = 2) {
        try {
            for (let i = 0; i < iterations; i++) {
                console.log(`Applying Lloyd relaxation iteration ${i+1}/${iterations}...`);
                const voronoi = this.generateVoronoi(points, width, height);
                
                if (!voronoi) {
                    console.error("Failed to generate Voronoi during relaxation");
                    return points;
                }
                
                // Calculate cell centroids
                for (let j = 0; j < points.length; j++) {
                    const cell = voronoi.cellPolygon(j);
                    if (!cell) continue;

                    // Calculate centroid
                    let [cx, cy] = this.calculateCentroid(cell);
                    
                    // Check for NaN
                    if (isNaN(cx) || isNaN(cy)) {
                        console.warn(`Found NaN centroid for cell ${j}, skipping`);
                        continue;
                    }
                    
                    // Apply some constraints to prevent points from clumping too much
                    // Keep points within boundaries with a small margin
                    const margin = 10;
                    cx = Math.max(margin, Math.min(width - margin, cx));
                    cy = Math.max(margin, Math.min(height - margin, cy));
                    
                    // Update point position
                    points[j] = [cx, cy];
                }
                
                // In later iterations, apply some small random jitter to avoid grid-like patterns
                if (i > 0) {
                    points = points.map(p => [
                        p[0] + (Math.random() * 2 - 1) * 2, // Small random offset
                        p[1] + (Math.random() * 2 - 1) * 2
                    ]);
                }
            }
            
            return points;
        } catch (error) {
            console.error("Error in Lloyd relaxation:", error);
            return points;
        }
    }

    // Calculate centroid of a polygon
    calculateCentroid(vertices) {
        try {
            let area = 0;
            let cx = 0;
            let cy = 0;
            
            for (let i = 0; i < vertices.length - 1; i++) {
                const x0 = vertices[i][0];
                const y0 = vertices[i][1];
                const x1 = vertices[i + 1][0];
                const y1 = vertices[i + 1][1];
                
                const a = x0 * y1 - x1 * y0;
                area += a;
                cx += (x0 + x1) * a;
                cy += (y0 + y1) * a;
            }
            
            if (Math.abs(area) < 0.0001) {
                // Nearly zero area, return center of vertices
                let sumX = 0, sumY = 0;
                for (let i = 0; i < vertices.length - 1; i++) {
                    sumX += vertices[i][0];
                    sumY += vertices[i][1];
                }
                return [sumX / (vertices.length - 1), sumY / (vertices.length - 1)];
            }
            
            area = area * 3;
            return [cx / area, cy / area];
        } catch (error) {
            console.error("Error calculating centroid:", error);
            // Return centroid of first triangle as fallback
            if (vertices && vertices.length >= 3) {
                return [(vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3,
                        (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3];
            }
            return [0, 0]; // Default fallback
        }
    }

    // Get neighbors of a cell
    getNeighbors(cellIndex) {
        return this.delaunay.neighbors(cellIndex);
    }
    
    // Find cell that contains a point
    findCell(x, y) {
        if (!this.delaunay) return -1;
        return this.delaunay.find(x, y);
    }
    
    // Calculate the area of a polygon
    calculatePolygonArea(vertices) {
        let area = 0;
        const n = vertices.length;
        
        for (let i = 0; i < n - 1; i++) {
            area += vertices[i][0] * vertices[i+1][1];
            area -= vertices[i][1] * vertices[i+1][0];
        }
        
        // Close the polygon
        area += vertices[n-1][0] * vertices[0][1];
        area -= vertices[n-1][1] * vertices[0][0];
        
        return Math.abs(area) / 2;
    }
}
