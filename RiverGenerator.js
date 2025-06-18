var RiverGenerator = function() {
    this.rivers = [];
};

RiverGenerator.prototype.generate = function(cells) {
    return this.generateRivers(cells);
};

// Find nearest water body to a point
RiverGenerator.prototype.findNearestWaterBody = function(cell, waterBodies) {
    return waterBodies.reduce((nearest, water) => {
        const dist = Math.sqrt(
            Math.pow(cell.x - water.x, 2) + 
            Math.pow(cell.y - water.y, 2)
        );
        return (!nearest || dist < nearest.dist) ? 
            { cell: water, dist: dist } : nearest;
    }, null);
};

// Cost function for moving between cells - improved for more natural river paths
RiverGenerator.prototype.getCost = function(from, to) {
    // Prefer downhill paths
    const elevationDiff = from.elevation - to.elevation;
    
    // Basic cost is based on elevation difference
    let cost = 1;
    
    if (elevationDiff > 0) {
        // Going downhill - strongly prefer steeper slopes
        cost = 1 / (1 + elevationDiff * 5);
    } else if (elevationDiff < 0) {
        // Going uphill - strongly avoid
        cost = 10 + Math.abs(elevationDiff) * 20;
    } else {
        // Flat - slightly higher cost to encourage some meandering
        cost = 2;
    }
    
    // Rivers prefer to follow existing paths of high precipitation
    // This simulates water naturally flowing where other water already flows
    if (to.precipitation > 150) {
        cost *= 0.8;
    }
    
    // Avoid crossing very steep elevation changes (waterfalls are rare)
    if (Math.abs(elevationDiff) > 0.2) {
        cost *= 1.5;
    }
    
    return cost;
};

// Heuristic function for A* pathfinding
RiverGenerator.prototype.heuristic = function(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

// Generate rivers from high elevation points
RiverGenerator.prototype.generateRivers = function(cells, riverCount = 50) {
    var waterBodies = cells.filter(cell => cell.type === 'water');
    
    // Only generate rivers if we have water bodies to flow into
    if (waterBodies.length === 0) {
        return [];
    }

    // Sort cells by elevation to find potential river sources
    var possibleSources = cells
        .filter(cell => {
            return cell.type === 'land' && 
                   cell.elevation > 0.6 && // Only start from high elevation
                   cell.neighbors.length > 0; // Must have neighbors
        })
        .sort((a, b) => b.elevation - a.elevation);

    this.rivers = [];
    let attempts = 0;
    let successfulRivers = 0;
    
    // Weight potential sources by precipitation - prefer wetter areas for river sources
    possibleSources.forEach(source => {
        source.riverSourceWeight = source.elevation * 0.7 + (source.precipitation / 300) * 0.3;
    });
    
    // Sort by the combined weight
    possibleSources.sort((a, b) => b.riverSourceWeight - a.riverSourceWeight);

    while (successfulRivers < riverCount && attempts < riverCount * 3) {
        attempts++;
        
        // Use weighted random selection for sources
        const sourceIndex = Math.floor(Math.random() * Math.min(100, possibleSources.length));
        const source = possibleSources[sourceIndex];
        
        if (!source) break;

        // Find nearest water body
        const nearest = this.findNearestWaterBody(source, waterBodies);
        if (!nearest) continue;

        // Generate river path using A* pathfinding
        const path = this.findRiverPath(source, nearest.cell, cells);
        
        if (path && path.length > 3) { // Minimum length for a valid river
            // Convert cell path to smooth river points
            const riverPoints = this.smoothRiverPath(path);
            
            // Calculate river width based on path length and source elevation
            const riverWidth = Math.min(5, Math.max(1, path.length / 20)) * 
                              (0.5 + source.elevation * 0.5);
            
            // Add river if it doesn't intersect too much with existing rivers
            if (this.isValidRiverPath(riverPoints, this.rivers)) {
                this.rivers.push({
                    id: this.rivers.length,
                    points: riverPoints,
                    source: source,
                    mouth: nearest.cell,
                    width: riverWidth
                });
                
                // Mark cells along the river path
                path.forEach(cell => {
                    cell.isRiver = true;
                    cell.riverWidth = riverWidth;
                    
                    // Increase precipitation along rivers (river valleys are wetter)
                    cell.precipitation = Math.min(300, cell.precipitation * 1.2);
                    
                    // Slightly lower elevation of river cells to create valleys
                    if (cell.type === 'land' && cell.elevation > 0.4) {
                        cell.elevation = Math.max(0.4, cell.elevation * 0.95);
                    }
                });
                
                successfulRivers++;
            }
        }
    }

    return this.rivers;
};

// A* pathfinding for river path
RiverGenerator.prototype.findRiverPath = function(start, goal, cells) {
    // Priority queue for A* search
    var openSet = [start];
    var closedSet = new Set();
    
    // Maps to track g scores and parents
    var gScore = new Map();
    var cameFrom = new Map();
    
    gScore.set(start.id, 0);
    
    while (openSet.length > 0) {
        // Find node with lowest f score
        var current = openSet.reduce((min, cell) => {
            const g = gScore.get(cell.id) || Infinity;
            const f = g + this.heuristic(cell, goal);
            return (!min || f < min.f) ? {cell, f} : min;
        }, null).cell;
        
        // If we reached the goal, reconstruct path
        if (current === goal || current.type === 'water') {
            return this.reconstructPath(cameFrom, current);
        }
        
        // Move current from open to closed set
        openSet = openSet.filter(cell => cell !== current);
        closedSet.add(current.id);
        
        // Check all neighbors
        for (var i = 0; i < current.neighbors.length; i++) {
            var neighborId = current.neighbors[i];
            var neighbor = cells[neighborId];
            
            if (!neighbor || closedSet.has(neighbor.id)) {
                continue;
            }
            
            // Calculate cost to this neighbor
            const cost = this.getCost(current, neighbor);
            const tentativeG = (gScore.get(current.id) || 0) + cost;
            
            // If neighbor not in open set, add it
            if (!openSet.includes(neighbor)) {
                openSet.push(neighbor);
            } 
            // If this path to neighbor is worse, skip
            else if (tentativeG >= (gScore.get(neighbor.id) || Infinity)) {
                continue;
            }
            
            // This is the best path so far
            cameFrom.set(neighbor.id, current);
            gScore.set(neighbor.id, tentativeG);
        }
    }
    
    // No path found
    return null;
};

// Reconstruct path from A* search
RiverGenerator.prototype.reconstructPath = function(cameFrom, current) {
    var path = [current];
    while (cameFrom.has(current.id)) {
        current = cameFrom.get(current.id);
        path.unshift(current);
    }
    return path;
};

// Smooth the river path for more natural appearance
RiverGenerator.prototype.smoothRiverPath = function(path) {
    // Convert cell centers to points
    var points = path.map(cell => ({x: cell.x, y: cell.y}));
    
    // For very short rivers, just return the points
    if (points.length < 4) return points;
    
    // Apply Chaikin's algorithm for curve smoothing
    var smoothed = [];
    for (var i = 0; i < points.length - 1; i++) {
        var p0 = points[i];
        var p1 = points[i + 1];
        
        // Original point
        if (i === 0) smoothed.push(p0);
        
        // Add two points that are 1/4 and 3/4 along each segment
        smoothed.push({
            x: p0.x * 0.75 + p1.x * 0.25,
            y: p0.y * 0.75 + p1.y * 0.25
        });
        
        smoothed.push({
            x: p0.x * 0.25 + p1.x * 0.75,
            y: p0.y * 0.25 + p1.y * 0.75
        });
        
        // End point
        if (i === points.length - 2) smoothed.push(p1);
    }
    
    return smoothed;
};

// Check if a new river path is valid (not too close to existing rivers)
RiverGenerator.prototype.isValidRiverPath = function(newPath, existingRivers) {
    // For the first few rivers, always valid
    if (existingRivers.length < 5) return true;
    
    // Check intersection with existing rivers
    var intersectionCount = 0;
    var minDistance = Infinity;
    
    for (var i = 0; i < existingRivers.length; i++) {
        var river = existingRivers[i];
        
        // Check distance between river points
        for (var j = 0; j < newPath.length; j += 3) { // Skip some points for efficiency
            var newPoint = newPath[j];
            
            for (var k = 0; k < river.points.length; k += 3) {
                var existingPoint = river.points[k];
                
                var distance = Math.sqrt(
                    Math.pow(newPoint.x - existingPoint.x, 2) + 
                    Math.pow(newPoint.y - existingPoint.y, 2)
                );
                
                minDistance = Math.min(minDistance, distance);
                
                if (distance < 20) { // Threshold for considering too close
                    intersectionCount++;
                }
                
                // Early exit if too many intersections
                if (intersectionCount > 5) {
                    return false;
                }
            }
        }
    }
    
    // Valid if not too many intersections and not too close to other rivers
    return intersectionCount <= 3 && minDistance > 10;
};
