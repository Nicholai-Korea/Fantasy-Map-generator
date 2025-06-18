var BiomeGenerator = function(noiseGenerator) {
    this.noiseGenerator = noiseGenerator;
    this.biomeTable = this.createBiomeTable();
    this.windPattern = this.generateWindPattern();
};

BiomeGenerator.prototype.createBiomeTable = function() {
    return {
        // Water biomes
        water: {
            deep: { min: 0, max: 0.2 },
            ocean: { min: 0.2, max: 0.3 },
            shallow: { min: 0.3, max: 0.35 }
        },
        // Land biomes matrix based on temperature and precipitation
        // Temperature ranges:
        // Very Hot: > 25°C
        // Hot: 15-25°C
        // Temperate: 5-15°C
        // Cold: -5-5°C
        // Very Cold: < -5°C
        //
        // Precipitation ranges:
        // Very Wet: > 175cm/year
        // Wet: 125-175cm/year
        // Medium: 75-125cm/year
        // Dry: 25-75cm/year
        // Very Dry: < 25cm/year
        land: [
            // Very Hot climate
            { temp: [25, 100], precip: [0, 25], biome: 'desert' },
            { temp: [25, 100], precip: [25, 75], biome: 'savanna' },
            { temp: [25, 100], precip: [75, 125], biome: 'grassland' },
            { temp: [25, 100], precip: [125, 175], biome: 'forest' },
            { temp: [25, 100], precip: [175, 1000], biome: 'rainforest' },
            
            // Hot climate
            { temp: [15, 25], precip: [0, 25], biome: 'desert' },
            { temp: [15, 25], precip: [25, 75], biome: 'shrubland' },
            { temp: [15, 25], precip: [75, 125], biome: 'grassland' },
            { temp: [15, 25], precip: [125, 175], biome: 'forest' },
            { temp: [15, 25], precip: [175, 1000], biome: 'rainforest' },
            
            // Temperate climate
            { temp: [5, 15], precip: [0, 25], biome: 'shrubland' },
            { temp: [5, 15], precip: [25, 75], biome: 'grassland' },
            { temp: [5, 15], precip: [75, 125], biome: 'forest' },
            { temp: [5, 15], precip: [125, 1000], biome: 'forest' },
            
            // Cold climate
            { temp: [-5, 5], precip: [0, 25], biome: 'tundra' },
            { temp: [-5, 5], precip: [25, 75], biome: 'tundra' },
            { temp: [-5, 5], precip: [75, 125], biome: 'taiga' },
            { temp: [-5, 5], precip: [125, 1000], biome: 'taiga' },
            
            // Very Cold climate
            { temp: [-100, -5], precip: [0, 1000], biome: 'tundra' }
        ]
    };
};

BiomeGenerator.prototype.generate = function(cells) {
    const width = Math.max(...cells.map(cell => cell.x)) + 1;
    const height = Math.max(...cells.map(cell => cell.y)) + 1;
    
    // Generate base temperature and precipitation
    this.generateTemperature(cells, width, height);
    this.generatePrecipitation(cells, width, height);
    
    // Assign biomes based on temperature, precipitation and elevation
    return this.assignBiomes(cells);
};

BiomeGenerator.prototype.generateWindPattern = function() {
    // Random prevailing wind direction (angle in radians)
    const windDirection = Math.random() * Math.PI * 2;
    return {
        direction: windDirection,
        strength: 0.5 + Math.random() * 0.5, // Wind strength 0.5-1.0
        // Secondary winds (perpendicular to main direction)
        secondary: {
            direction: windDirection + Math.PI / 2,
            strength: 0.3 + Math.random() * 0.3 // Secondary wind strength 0.3-0.6
        }
    };
};

// Helper function to calculate rain shadow effect
BiomeGenerator.prototype.calculateRainShadow = function(cell, cells, width, height) {
    const windDir = this.windPattern.direction;
    const windStrength = this.windPattern.strength;
    const checkDistance = 20; // How far upwind to check for mountains
    
    // Calculate upwind position
    const upwindX = cell.x - Math.cos(windDir) * checkDistance;
    const upwindY = cell.y - Math.sin(windDir) * checkDistance;
    
    let maxBlockingHeight = 0;
    let rainShadowEffect = 0;
    
    // Check cells between current position and upwind position
    for (let dist = 1; dist <= checkDistance; dist++) {
        const checkX = Math.floor(cell.x - Math.cos(windDir) * dist);
        const checkY = Math.floor(cell.y - Math.sin(windDir) * dist);
        
        // Skip if outside map
        if (checkX < 0 || checkX >= width || checkY < 0 || checkY >= height) continue;
        
        // Find cell at check position
        const checkCell = cells.find(c => c.x === checkX && c.y === checkY);
        if (!checkCell) continue;
        
        // If we find a higher elevation, it affects rain shadow
        if (checkCell.elevation > maxBlockingHeight) {
            maxBlockingHeight = checkCell.elevation;
            // Rain shadow effect increases with elevation difference and wind strength
            if (checkCell.elevation > 0.6) { // Only significant mountains create rain shadows
                rainShadowEffect += (checkCell.elevation - 0.6) * windStrength * (1 - dist/checkDistance);
            }
        }
    }
    
    return Math.min(rainShadowEffect, 0.8); // Cap maximum rain shadow effect
};

// Helper function to apply wind effects to temperature
BiomeGenerator.prototype.calculateWindTemperatureEffect = function(cell, cells, width, height) {
    const windDir = this.windPattern.direction;
    const windStrength = this.windPattern.strength;
    const checkDistance = 15;
    
    let temperatureEffect = 0;
    let waterCount = 0;
    let landCount = 0;
    
    // Check upwind cells for water/land ratio
    for (let dist = 1; dist <= checkDistance; dist++) {
        const checkX = Math.floor(cell.x - Math.cos(windDir) * dist);
        const checkY = Math.floor(cell.y - Math.sin(windDir) * dist);
        
        if (checkX < 0 || checkX >= width || checkY < 0 || checkY >= height) continue;
        
        const checkCell = cells.find(c => c.x === checkX && c.y === checkY);
        if (!checkCell) continue;
        
        if (checkCell.type === 'water') {
            waterCount++;
        } else {
            landCount++;
        }
    }
    
    // Water has a moderating effect on temperature
    const waterRatio = waterCount / (waterCount + landCount);
    if (waterRatio > 0.5) {
        // Moderate temperatures (cooling in summer, warming in winter)
        const latitudeEffect = (height / 2 - cell.y) / (height / 2); // -1 to 1
        temperatureEffect = -latitudeEffect * 5 * waterRatio * windStrength;
    }
    
    return temperatureEffect;
};

BiomeGenerator.prototype.generateTemperature = function(cells, width, height) {
    const scale = 0.002;
    
    cells.forEach(cell => {
        // Base temperature varies with latitude (y position)
        const latitude = (height / 2 - cell.y) / (height / 2); // -1 to 1
        const baseTemp = 30 * (1 - Math.abs(latitude)); // Hotter at equator
        
        // Add some noise for local variation
        const tempNoise = this.noiseGenerator.generate2D(cell.x, cell.y, scale, 2, 0.5, 2) * 10;
        
        // Temperature decreases with elevation (approximately 6.5°C per 1000m)
        const elevationEffect = cell.elevation * -20;
        
        // Add wind temperature effect
        const windEffect = this.calculateWindTemperatureEffect(cell, cells, width, height);
        
        cell.temperature = baseTemp + tempNoise + elevationEffect + windEffect;
    });
};

BiomeGenerator.prototype.generatePrecipitation = function(cells, width, height) {
    const scale = 0.003;
    
    cells.forEach(cell => {
        // Base precipitation with noise - use warped noise if available
        let precip;
        if (typeof this.noiseGenerator.generateWarpedNoise === 'function') {
            precip = this.noiseGenerator.generateWarpedNoise(
                cell.x + 1000,
                cell.y + 1000,
                scale,
                10, // warp strength
                3   // octaves
            );
        } else {
            precip = this.noiseGenerator.generate2D(
                cell.x + 1000,
                cell.y + 1000,
                scale,
                3,
                0.5,
                2
            );
        }
        
        // Latitude effect - more precipitation near equator
        const latitude = (height / 2 - cell.y) / (height / 2);
        const latitudeEffect = 1 - Math.abs(latitude) * 0.4;
        
        // Elevation effect - more precipitation at higher elevations, up to a point
        // Enhanced mountain precipitation effect (orographic lifting)
        let elevationEffect = 0;
        if (cell.elevation < 0.7) {
            // Normal terrain gets increasing precipitation with elevation
            elevationEffect = cell.elevation * 0.2;
        } else if (cell.elevation < 0.85) {
            // High mountains get maximum precipitation (rain/snow)
            elevationEffect = 0.7 * 0.2 + (cell.elevation - 0.7) * 0.3;
        } else {
            // Highest peaks get reduced precipitation (too cold for much moisture)
            elevationEffect = 0.7 * 0.2 + 0.15 * 0.3 - (cell.elevation - 0.85) * 0.5;
        }
        
        // Calculate rain shadow effect (improved)
        const rainShadowEffect = this.calculateRainShadow(cell, cells, width, height);
        
        // Combine effects with enhanced weighting
        precip = (precip * 0.4 + latitudeEffect * 0.3 + elevationEffect * 0.3) * (1 - rainShadowEffect);
        
        // Scale to 0-300cm/year range with slight adjustments for more variability
        cell.precipitation = Math.min(300, precip * 300); // Allow for some extremely wet areas
    });
    
    // Add moisture from water bodies with improved coastal influence
    const waterCells = cells.filter(cell => cell.type === 'water');
    cells.forEach(cell => {
        if (cell.type !== 'water') {
            // Find distance to nearest water
            const distToWater = Math.min(...waterCells.map(water => 
                Math.sqrt(Math.pow(cell.x - water.x, 2) + Math.pow(cell.y - water.y, 2))
            ));
            
            // Calculate wind direction effect on moisture transport
            const windEffect = Math.cos(
                Math.atan2(cell.y - waterCells[0].y, cell.x - waterCells[0].x) - 
                this.windPattern.direction
            ) * 0.5 + 0.5; // 0-1 range
            
            // Enhanced coastal moisture with wind factor
            const coastalDistance = width * 0.15; // How far inland the coastal effect reaches
            if (distToWater < coastalDistance) {
                const moistureBonus = 60 * (1 - distToWater / coastalDistance) * windEffect;
                cell.precipitation = Math.min(300, cell.precipitation + moistureBonus);
                
                // Create extra wet coastal areas in wind-facing shores
                if (windEffect > 0.7 && distToWater < coastalDistance * 0.3) {
                    cell.precipitation = Math.min(300, cell.precipitation + 30);
                }
            }
        }
    });
};

BiomeGenerator.prototype.assignBiomes = function(cells) {
    cells.forEach(cell => {
        // Skip if cell is above mountain threshold (handled by mountain gradient)
        if (cell.elevation >= 0.7) {
            return;
        }
        
        if (cell.type === 'water') {
            // Assign water biomes based on depth
            for (const [biome, range] of Object.entries(this.biomeTable.water)) {
                if (cell.elevation >= range.min && cell.elevation < range.max) {
                    cell.biome = biome;
                    break;
                }
            }
            return;
        }
        
        // Find matching land biome based on temperature and precipitation
        const matchingBiome = this.biomeTable.land.find(entry =>
            cell.temperature >= entry.temp[0] && 
            cell.temperature < entry.temp[1] && 
            cell.precipitation >= entry.precip[0] && 
            cell.precipitation < entry.precip[1]
        );
        
        cell.biome = matchingBiome ? matchingBiome.biome : 'grassland';
    });
    
    return cells;
};
