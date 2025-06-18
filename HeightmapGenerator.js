var HeightmapGenerator = function(noiseGenerator) {
    this.noiseGenerator = noiseGenerator;
    this.currentTemplate = HeightmapTemplates.templates.random;
};

// Set the template to use for generation
HeightmapGenerator.prototype.setTemplate = function(templateId) {
    const template = HeightmapTemplates.getTemplate(templateId);
    if (template) {
        console.log(`Using template: ${template.name}`);
        this.currentTemplate = template;
    } else {
        console.warn(`Template ${templateId} not found, using random`);
        this.currentTemplate = HeightmapTemplates.templates.random;
    }
};

// Main generate method that will be called from MapGenerator
HeightmapGenerator.prototype.generate = function(cells) {
    const width = Math.max(...cells.map(cell => cell.x)) + 1;
    const height = Math.max(...cells.map(cell => cell.y)) + 1;
    return this.generateHeightmap(cells, width, height);
};

// Generate heightmap using template-based approach
HeightmapGenerator.prototype.generateHeightmap = function(cells, width, height) {
    const template = this.currentTemplate;
    
    cells.forEach(cell => {
        // Apply template's coordinate transformation
        const transformed = template.transform(cell.x, cell.y, width, height);
        const tx = transformed.x;
        const ty = transformed.y;
        
        // Calculate falloff mask
        const edgeDistX = Math.min(tx, width - tx) / (width / 2);
        const edgeDistY = Math.min(ty, height - ty) / (height / 2);
        const edgeFactor = Math.min(edgeDistX, edgeDistY);
        
        // Distance from center for continental shapes
        const centerX = width / 2;
        const centerY = height / 2;
        const distanceFromCenter = Math.sqrt(
            Math.pow(tx - centerX, 2) + 
            Math.pow(ty - centerY, 2)
        );
        const maxDistance = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
        const distanceFactor = 1 - (distanceFromCenter / maxDistance);
        
        // Apply circular falloff mask
        const falloff = distanceFactor * edgeFactor;
        
        // Layer 1: Continent shapes with falloff using template parameters
        const continentNoise = this.noiseGenerator.generate2D(
            tx, 
            ty, 
            template.continentScale, 
            3,
            0.5,
            2
        ) * falloff;
        
        // Layer 2: Mountain ridges using ridge noise with template parameters
        const warpedX = tx + 50 * Math.sin(ty / 150);
        const mountainNoise = this.ridgeNoise(
            warpedX, 
            ty, 
            template.mountainScale,
            3
        );
        
        // Layer 3: Small-scale terrain details with template parameters
        const detailNoise = this.noiseGenerator.generate2D(
            tx, 
            ty, 
            template.detailScale, 
            2,
            0.5,
            2
        );
        
        // Combine all noise layers with template weights
        let elevation = (continentNoise * template.continentWeight) +
                       (mountainNoise * template.mountainWeight) +
                       (detailNoise * template.detailWeight);
        
        // Add island generation in deeper waters
        if (elevation < 0.25 && elevation > 0.1) {
            const islandNoise = this.noiseGenerator.generate2D(
                tx + 500,
                ty + 500,
                0.02,
                1, 
                0.5, 
                2
            );
            
            if (islandNoise > 0.7) {
                elevation += 0.2;
            }
        }
        
        // Apply coastal smoothing
        if (elevation > 0.3 && elevation < 0.4) {
            elevation = elevation * 0.7 + 0.35 * 0.3;
        }
        
        // Normalize and assign elevation
        cell.elevation = Math.max(0, Math.min(1, elevation));
        
        // Assign cell type based on elevation
        if (cell.elevation < 0.35) {
            cell.type = 'water';
            if (cell.elevation < 0.2) {
                cell.biome = 'deep';
            } else if (cell.elevation < 0.3) {
                cell.biome = 'ocean';
            } else {
                cell.biome = 'shallow';
            }
        } else if (cell.elevation < 0.4) {
            cell.type = 'coast';
            cell.biome = 'shallow';
        } else {
            cell.type = 'land';
        }
    });
    
    // Apply erosion simulation
    this.simulateErosion(cells);
    
    return cells;
};

// Create ridge noise effect (for mountain ranges)
HeightmapGenerator.prototype.ridgeNoise = function(x, y, scale, octaves) {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        // Get raw noise value
        const noiseVal = this.noiseGenerator.generate2D(
            x * frequency, 
            y * frequency, 
            1, // scale is already applied via frequency
            1, // single octave per iteration
            0.5, 
            2
        );
        
        // Convert to ridge pattern by taking absolute value and inverting
        const ridgeVal = 1 - Math.abs(noiseVal * 2 - 1);
        
        // Apply square function to create sharper ridges
        const sharpRidge = ridgeVal * ridgeVal;
        
        value += sharpRidge * amplitude;
        maxValue += amplitude;
        
        amplitude *= 0.5;
        frequency *= 2;
    }
    
    // Normalize
    return value / maxValue;
};

// Simple erosion simulation to create more realistic landforms
HeightmapGenerator.prototype.simulateErosion = function(cells) {
    // Number of erosion iterations
    const iterations = 3;
    
    for (let iter = 0; iter < iterations; iter++) {
        // Make a copy of current elevations
        const originalElevations = cells.map(cell => cell.elevation);
        
        cells.forEach((cell, index) => {
            // Skip water cells
            if (cell.type === 'water') return;
            
            // Find all neighbors
            const neighbors = cell.neighbors;
            
            // Find lowest neighbor
            let lowestNeighbor = null;
            let lowestElevation = 1.1; // Above max possible
            
            for (const neighborId of neighbors) {
                const neighbor = cells[neighborId];
                if (neighbor && neighbor.elevation < lowestElevation) {
                    lowestElevation = neighbor.elevation;
                    lowestNeighbor = neighbor;
                }
            }
            
            // If we have a lower neighbor, simulate erosion
            if (lowestNeighbor && lowestNeighbor.elevation < cell.elevation) {
                // Calculate erosion amount (higher for steeper slopes)
                const elevationDiff = cell.elevation - lowestNeighbor.elevation;
                const erosionAmount = Math.min(elevationDiff * 0.2, 0.05);
                
                // Erode current cell
                cell.elevation -= erosionAmount;
                
                // Deposit some sediment at the lower cell
                // Only if it's land, to avoid filling oceans
                if (lowestNeighbor.type !== 'water') {
                    lowestNeighbor.elevation += erosionAmount * 0.3;
                }
            }
        });
    }
};
