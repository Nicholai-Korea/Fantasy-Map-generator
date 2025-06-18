var VoronoiGenerator = function(width, height, cellCount = 8000) { // Reduced cell count for better performance
    try {
        console.log(`Initializing VoronoiGenerator with width=${width}, height=${height}, cellCount=${cellCount}`);
        this.width = width;
        this.height = height;
        this.cellCount = cellCount;
        
        // Check if d3 is available
        if (typeof d3 === 'undefined') {
            console.error("d3.js library is not loaded! This is required for Voronoi generation.");
            throw new Error("d3.js is not available");
        }
        
        this.voronoiHelper = new VoronoiHelper();
        this.points = [];
        this.cells = [];
    } catch (error) {
        console.error("Error initializing VoronoiGenerator:", error);
        throw error;
    }
};

// Generate the complete Voronoi diagram
VoronoiGenerator.prototype.generate = function() {
    try {
        console.log("Starting Voronoi generation process");
        return this.generateGrid();
    } catch (error) {
        console.error("Error in Voronoi generation:", error);
        throw error;
    }
};

// Initialize points with improved distribution
VoronoiGenerator.prototype.generatePoints = function() {
    try {
        console.log("Generating points for Voronoi diagram...");
        // Use Poisson disc sampling for more evenly distributed points
        // This ensures more uniform cell sizes compared to purely random distribution
        const minDistance = Math.sqrt((this.width * this.height) / this.cellCount) * 0.65;
        
        // Start with some random points to seed the process
        this.points = [];
        
        // Add initial random points
        const initialPoints = Math.min(500, this.cellCount / 10);
        for (let i = 0; i < initialPoints; i++) {
            this.points.push([
                Math.random() * this.width,
                Math.random() * this.height
            ]);
        }
        
        // Fill remaining points using improved distribution
        while (this.points.length < this.cellCount) {
            const candidatePoint = [
                Math.random() * this.width,
                Math.random() * this.height
            ];
            
            // Check distance to existing points
            let tooClose = false;
            for (const point of this.points) {
                const dx = candidatePoint[0] - point[0];
                const dy = candidatePoint[1] - point[1];
                const distSq = dx * dx + dy * dy;
                
                if (distSq < minDistance * minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            // Add point if it's not too close to any existing point
            if (!tooClose) {
                this.points.push(candidatePoint);
            }
        }
        
        console.log(`Generated ${this.points.length} points for Voronoi diagram`);
    } catch (error) {
        console.error("Error generating points:", error);
        throw error;
    }
};

// Generate the basic grid with Lloyd relaxation
VoronoiGenerator.prototype.generateGrid = function() {
    try {
        // Generate initial points with improved distribution
        this.generatePoints();

        // Apply Lloyd relaxation
        console.log("Applying Lloyd relaxation...");
        this.points = this.voronoiHelper.applyLloydRelaxation(
            this.points,
            this.width,
            this.height,
            2 // Reduced number of relaxation iterations for better performance
        );

        // Generate final Voronoi diagram and store the helper for point location
        console.log("Generating final Voronoi diagram...");
        const voronoi = this.voronoiHelper.generateVoronoi(
            this.points,
            this.width,
            this.height
        );

        if (!voronoi) {
            console.error("Failed to generate Voronoi diagram!");
            return [];
        }

        // Create cell objects with additional properties
        console.log("Creating cell objects...");
        this.cells = this.points.map((point, index) => {
            try {
                // Get neighbors for this cell
                const neighbors = Array.from(voronoi.neighbors(index));
                
                // Get vertices for the cell polygon
                const vertices = this.getVerticesForCell(voronoi, index);
                
                // Calculate cell area and perimeter
                const area = this.calculateCellArea(vertices);
                const perimeter = this.calculateCellPerimeter(vertices);
                
                // Return enhanced cell object
                return {
                    id: index,
                    x: point[0],
                    y: point[1],
                    elevation: 0,
                    moisture: 0,
                    temperature: 0,
                    precipitation: 0,
                    type: 'land', // Will be updated later
                    biome: null,
                    neighbors: neighbors,
                    vertices: vertices,
                    area: area,
                    perimeter: perimeter,
                    // Compactness - ratio of area to perimeter squared (normalized by constant)
                    // Higher values mean more compact (circle-like) shapes
                    compactness: (4 * Math.PI * area) / (perimeter * perimeter)
                };
            } catch (cellError) {
                console.error(`Error creating cell ${index}:`, cellError);
                // Return a simplified default cell if there was an error
                return {
                    id: index,
                    x: point[0],
                    y: point[1],
                    elevation: 0,
                    type: 'land',
                    biome: 'grassland',
                    neighbors: [],
                    vertices: []
                };
            }
        });

        console.log(`Created ${this.cells.length} cell objects successfully`);
        return this.cells;
    } catch (error) {
        console.error("Error in generateGrid:", error);
        return [];
    }
};

// Get vertices for a cell
VoronoiGenerator.prototype.getVerticesForCell = function(voronoi, index) {
    const polygon = voronoi.cellPolygon(index);
    if (!polygon) return [];
    // Remove the last point as it's a duplicate of the first
    return polygon.slice(0, -1).map(point => ({
        x: point[0],
        y: point[1]
    }));
};

// Calculate the area of a cell polygon
VoronoiGenerator.prototype.calculateCellArea = function(vertices) {
    let area = 0;
    const n = vertices.length;
    
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }
    
    return Math.abs(area) / 2;
};

// Calculate the perimeter of a cell polygon
VoronoiGenerator.prototype.calculateCellPerimeter = function(vertices) {
    let perimeter = 0;
    const n = vertices.length;
    
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const dx = vertices[j].x - vertices[i].x;
        const dy = vertices[j].y - vertices[i].y;
        perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    return perimeter;
};
