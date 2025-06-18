var MapGenerator = function() {
    try {
        console.log("Initializing MapGenerator...");
        
        // Initialize canvas
        this.canvas = document.getElementById('mapCanvas');
        if (!this.canvas) {
            console.error("Canvas element not found! Make sure there's a canvas with id 'mapCanvas'");
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Ensure canvas size is set
        if (!this.canvas.width || !this.canvas.height) {
            console.log("Setting canvas dimensions to window size");
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        // Initialize UI elements
        this.cellInfo = document.getElementById('cellInfo');
        this.generateButton = document.getElementById('generateButton');
        this.zoomInButton = document.getElementById('zoomInButton');
        this.zoomOutButton = document.getElementById('zoomOutButton');
        this.resetZoomButton = document.getElementById('resetZoomButton');
        this.zoomLevelDisplay = document.getElementById('zoomLevel');

        // Initialize view state
        this.viewState = {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0
        };

        // Initialize generators
        console.log("Creating NoiseGenerator...");
        this.noiseGen = new NoiseGenerator(Math.random());
        
        console.log("Creating VoronoiGenerator...");
        this.voronoiGen = new VoronoiGenerator(window.innerWidth, window.innerHeight);
        
        console.log("Creating HeightmapGenerator...");
        this.heightmapGen = new HeightmapGenerator(this.noiseGen);
        
        console.log("Creating BiomeGenerator...");
        this.biomeGen = new BiomeGenerator(this.noiseGen);

        console.log("Creating RiverGenerator...");
        this.riverGen = new RiverGenerator();

        // Map data
        this.cells = [];

        // Enhanced biome colors with more realistic and visually appealing shades
        this.biomeColors = {
            // Land biomes
            desert: '#E4D7A8',       // Light sandy yellow
            savanna: '#BFB86E',      // Dry grass yellow-green
            tundra: '#E0E0D1',       // Light gray-white
            shrubland: '#C5C288',    // Pale olive
            taiga: '#5A7357',        // Dark conifer green
            grassland: '#A8C288',    // Light yellow-green
            forest: '#4B7337',       // Medium forest green
            rainforest: '#2E6D40'    // Dark emerald green
        };

        // Terrain feature colors
        this.terrainColors = {
            mountain: {
                snow: '#FFFFFF',     // Snow caps
                high: '#FF5050',     // High mountain (red)
                mid: '#FF8C00',      // Mid mountain (orange)
                low: '#FFDC00'       // Foothills (yellow)
            },
            water: {
                deep: '#0A3875',     // Deep ocean
                medium: '#1E50A0',   // Medium depth
                shallow: '#4781D3',  // Shallow water
                shore: '#71A5DE'     // Shoreline
            },
            river: '#3399FF'         // River blue
        };

        // Set up event listeners
        console.log("Setting up event listeners...");
        this.setupEventListeners();

        console.log("MapGenerator initialized successfully!");
    } catch (error) {
        console.error("Error initializing MapGenerator:", error);
    }
};

MapGenerator.prototype.setupEventListeners = function() {
    var self = this;

    // Handle window resize
    window.addEventListener('resize', function() {
        self.resize();
    });

    // Handle generate button click
    this.generateButton.addEventListener('click', function() {
        self.generateMap();
    });

    // Handle mouse move for cell info
    this.canvas.addEventListener('mousemove', function(event) {
        // Update dragging position if dragging
        if (self.viewState.isDragging) {
            const deltaX = event.clientX - self.viewState.lastMouseX;
            const deltaY = event.clientY - self.viewState.lastMouseY;
            
            self.viewState.offsetX += deltaX;
            self.viewState.offsetY += deltaY;
            
            self.viewState.lastMouseX = event.clientX;
            self.viewState.lastMouseY = event.clientY;
            
            self.render();
        } else {
            self.showCellInfo(event);
        }
    });
    
    // Handle zoom in button
    this.zoomInButton.addEventListener('click', function() {
        self.zoomIn();
    });
    
    // Handle zoom out button
    this.zoomOutButton.addEventListener('click', function() {
        self.zoomOut();
    });
    
    // Handle reset zoom/pan button
    this.resetZoomButton.addEventListener('click', function() {
        self.resetView();
    });
    
    // Handle mouse wheel for zooming
    this.canvas.addEventListener('wheel', function(event) {
        event.preventDefault();
        
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        self.zoomAtPoint(zoomFactor, event.clientX, event.clientY);
    });
    
    // Handle mouse down for panning
    this.canvas.addEventListener('mousedown', function(event) {
        self.viewState.isDragging = true;
        self.viewState.lastMouseX = event.clientX;
        self.viewState.lastMouseY = event.clientY;
        self.canvas.style.cursor = 'grabbing';
    });
    
    // Handle mouse up for ending panning
    window.addEventListener('mouseup', function() {
        if (self.viewState.isDragging) {
            self.viewState.isDragging = false;
            self.canvas.style.cursor = 'default';
        }
    });
    
    // Handle key events for navigation
    window.addEventListener('keydown', function(event) {
        const panAmount = 50;
        
        switch (event.key) {
            case '+':
            case '=':
                self.zoomIn();
                break;
            case '-':
            case '_':
                self.zoomOut();
                break;
            case '0':
                self.resetView();
                break;
            case 'ArrowUp':
                self.viewState.offsetY += panAmount;
                self.render();
                break;
            case 'ArrowDown':
                self.viewState.offsetY -= panAmount;
                self.render();
                break;
            case 'ArrowLeft':
                self.viewState.offsetX += panAmount;
                self.render();
                break;
            case 'ArrowRight':
                self.viewState.offsetX -= panAmount;
                self.render();
                break;
        }
    });
};

MapGenerator.prototype.resize = function() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.render();
};

MapGenerator.prototype.generateMap = function() {
    try {
        console.log('Starting map generation');
        
        // Get random template
        const templates = HeightmapTemplates.getTemplateNames();
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        this.heightmapGen.setTemplate(randomTemplate.id);
        
        // Generate the basic map structure using Voronoi
        console.log('Generating Voronoi cells...');
        this.cells = this.voronoiGen.generate();
        console.log(`Generated ${this.cells.length} cells`);
        
        // Generate heightmap using template
        console.log('Generating heightmap...');
        this.cells = this.heightmapGen.generate(this.cells);
        
        // Generate biomes
        console.log('Generating biomes...');
        this.cells = this.biomeGen.generate(this.cells);
        
        // Generate rivers using instance method
        console.log('Generating rivers...');
        this.rivers = this.riverGen.generate(this.cells);
        
        // Render the map
        console.log('Rendering map...');
        this.render();
        console.log('Map generation complete');
        
    } catch (error) {
        console.error('Error in generateMap:', error);
        throw error;
    }
};

MapGenerator.prototype.getMountainColor = function(elevation) {
    // Mountain threshold (for reference, actual check is in render function)
    const mountainThreshold = 0.62;  // Lowered from 0.7
    const highPeakThreshold = 0.85;  // Lowered from 0.9
    
    // Snow-capped peaks (white)
    if (elevation >= highPeakThreshold) {
        return '#FFFFFF';
    }
    
    // High mountains (red to white transition)
    if (elevation >= 0.8) {
        const t = (elevation - 0.8) / (highPeakThreshold - 0.8);
        const r = 255;
        const g = Math.floor(50 + (t * 205)); // 50 to 255
        const b = Math.floor(50 + (t * 205)); // 50 to 255
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Mid mountains (orange-red to red)
    if (elevation >= 0.75) {
        const t = (elevation - 0.75) / 0.05;
        const r = 255;
        const g = Math.floor(120 - (t * 70)); // 120 to 50
        const b = Math.floor(50 * (1 - t)); // 50 to 0
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Low mountains (yellow-orange to orange-red)
    if (elevation >= 0.68) {
        const t = (elevation - 0.68) / 0.07;
        const r = 255;
        const g = Math.floor(200 - (t * 80)); // 200 to 120
        const b = Math.floor(50 * (1 - t)); // 50 to 0
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Mountain foothills (yellow to yellow-orange)
    const t = (elevation - mountainThreshold) / 0.06;
    const r = 255;
    const g = Math.floor(220 - (t * 20)); // 220 to 200
    const b = Math.floor(100 - (t * 50)); // 100 to 50
    
    return `rgb(${r}, ${g}, ${b})`;
};

MapGenerator.prototype.getWaterColor = function(elevation, x, y) {
    // Water gradient from deep blue to light blue
    // elevation ranges from 0 (deepest) to 0.35 (shoreline)
    
    // Add some noise to the depth based on position for texture
    const noiseValue = this.noiseGen.generate2D(
        x * 0.05,
        y * 0.05,
        0.5, // scale
        2,   // octaves
        0.5, // persistence
        2    // lacunarity
    ) * 0.15; // Scale noise effect
    
    // Adjust depth with noise
    let normalizedDepth = (elevation / 0.35) + noiseValue;
    normalizedDepth = Math.max(0, Math.min(1, normalizedDepth)); // Clamp between 0 and 1
    
    // Use colors from our terrain colors palette
    let color;
    if (normalizedDepth < 0.3) {
        // Deep water
        const t = normalizedDepth / 0.3;
        color = this.lerpColor(this.terrainColors.water.deep, this.terrainColors.water.medium, t);
    } else if (normalizedDepth < 0.7) {
        // Medium depth
        const t = (normalizedDepth - 0.3) / 0.4;
        color = this.lerpColor(this.terrainColors.water.medium, this.terrainColors.water.shallow, t);
    } else {
        // Shallow water
        const t = (normalizedDepth - 0.7) / 0.3;
        color = this.lerpColor(this.terrainColors.water.shallow, this.terrainColors.water.shore, t);
    }
    
    return color;
};

// Helper method to interpolate between two colors
MapGenerator.prototype.lerpColor = function(color1, color2, t) {
    // Parse colors if they're in hex format
    const parseColor = (color) => {
        if (color.startsWith('#')) {
            const r = parseInt(color.substring(1, 3), 16);
            const g = parseInt(color.substring(3, 5), 16);
            const b = parseInt(color.substring(5, 7), 16);
            return { r, g, b };
        } else if (color.startsWith('rgb')) {
            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3])
                };
            }
        }
        return { r: 0, g: 0, b: 0 };
    };
    
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
};

MapGenerator.prototype.render = function() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Save the canvas state
    this.ctx.save();
    
    // Apply transformation for zoom and pan
    this.ctx.translate(this.viewState.offsetX, this.viewState.offsetY);
    this.ctx.scale(this.viewState.scale, this.viewState.scale);

    // Draw cells
    for (var i = 0; i < this.cells.length; i++) {
        var cell = this.cells[i];
        
        // Determine cell color based on elevation or biome
        if (cell.elevation >= 0.62) {  // Lowered from 0.7 to show more mountains
            // Mountain terrain takes priority over biome
            this.ctx.fillStyle = this.getMountainColor(cell.elevation);
        } else if (cell.type === 'water') {
            this.ctx.fillStyle = this.getWaterColor(cell.elevation, cell.x, cell.y);
        } else {
            this.ctx.fillStyle = this.biomeColors[cell.biome];
        }
        
        // Draw cell
        this.ctx.beginPath();
        this.ctx.moveTo(cell.vertices[0].x, cell.vertices[0].y);
        for (var j = 1; j < cell.vertices.length; j++) {
            this.ctx.lineTo(cell.vertices[j].x, cell.vertices[j].y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add border for land cells that border water
        if (cell.type !== 'water' && this.cellBordersWater(cell)) {
            // For coast cells, use a slightly darker border
            if (cell.type === 'coast') {
                this.ctx.strokeStyle = 'rgba(70, 70, 70, 0.4)'; // Slightly darker for coast
            } else {
                this.ctx.strokeStyle = 'rgba(80, 80, 80, 0.3)'; // Translucent gray for other land
            }
            this.ctx.lineWidth = 1 / this.viewState.scale; // Adjust line width for zoom level
            this.ctx.stroke();
        }
    }
    
    // Draw rivers if they exist
    if (this.rivers && this.rivers.length > 0) {
        this.renderRivers();
    }
    
    // Restore the canvas state
    this.ctx.restore();
};

// New method to render rivers
MapGenerator.prototype.renderRivers = function() {
    if (!this.rivers || this.rivers.length === 0) return;
    
    // No need to save context as it's already saved in the main render method
    
    // Draw each river
    for (var i = 0; i < this.rivers.length; i++) {
        var river = this.rivers[i];
        var points = river.points;
        
        if (!points || points.length < 2) continue;
        
        // Calculate river width based on path position and river width property
        // Adjust base width based on zoom level
        const baseWidth = (river.width || 2) / this.viewState.scale;
        
        // Set river style
        this.ctx.strokeStyle = '#3399FF'; // Blue river color
        this.ctx.lineWidth = baseWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
          // Draw main river path
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        // Draw smooth curve through all points
        for (var j = 1; j < points.length; j++) {
            // Width gets larger as we approach the mouth (end) of the river
            const widthFactor = 1 + (j / points.length);
            this.ctx.lineWidth = baseWidth * widthFactor;
            
            this.ctx.lineTo(points[j].x, points[j].y);
        }
        
        this.ctx.stroke();
    }
    
    // No need to restore context as it will be restored in the main render method
};

// Initialize map legend
MapGenerator.prototype.initLegend = function() {
    const legendItems = document.getElementById('legendItems');
    if (!legendItems) return;
    
    // Clear existing items
    legendItems.innerHTML = '';
      // Add mountain legend items first (to emphasize importance)
    const mountainTypes = [
        { name: 'Snow Peak (≥ 0.85)', color: '#FFFFFF' },
        { name: 'High Mountain (≥ 0.8)', color: '#FF5050' },
        { name: 'Mountain (≥ 0.75)', color: '#FF8C00' },
        { name: 'Foothills (≥ 0.62)', color: '#FFDC00' }
    ];
    
    // Create mountain legend section
    const mountainSection = document.createElement('div');
    mountainSection.className = 'legend-section';
    const mountainTitle = document.createElement('div');
    mountainTitle.className = 'legend-section-title';
    mountainTitle.textContent = 'Mountains';
    mountainSection.appendChild(mountainTitle);
    
    mountainTypes.forEach(mountain => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = mountain.color;
        
        const label = document.createElement('div');
        label.className = 'legend-label';
        label.textContent = mountain.name;
        
        item.appendChild(colorBox);
        item.appendChild(label);
        mountainSection.appendChild(item);
    });
    
    legendItems.appendChild(mountainSection);
    
    // Add water legend items
    const waterTypes = [
        { name: 'Deep Ocean', color: this.terrainColors.water.deep },
        { name: 'Ocean', color: this.terrainColors.water.medium },
        { name: 'Shallow Water', color: this.terrainColors.water.shallow },
        { name: 'Shore', color: this.terrainColors.water.shore }
    ];
    
    // Create water legend section
    const waterSection = document.createElement('div');
    waterSection.className = 'legend-section';
    const waterTitle = document.createElement('div');
    waterTitle.className = 'legend-section-title';
    waterTitle.textContent = 'Water';
    waterSection.appendChild(waterTitle);
    
    waterTypes.forEach(water => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = water.color;
        
        const label = document.createElement('div');
        label.className = 'legend-label';
        label.textContent = water.name;
        
        item.appendChild(colorBox);
        item.appendChild(label);
        waterSection.appendChild(item);
    });
    
    legendItems.appendChild(waterSection);
    
    // Add biome legend items
    // Biome section
    const biomeSection = document.createElement('div');
    biomeSection.className = 'legend-section';
    const biomeTitle = document.createElement('div');
    biomeTitle.className = 'legend-section-title';
    biomeTitle.textContent = 'Biomes';
    biomeSection.appendChild(biomeTitle);
    
    // Add biomes to legend
    const biomeEntries = Object.entries(this.biomeColors)
        .filter(([biomeName]) => !['deep', 'ocean', 'shallow'].includes(biomeName)); // Filter out water biomes
    
    // Sort alphabetically
    biomeEntries.sort((a, b) => a[0].localeCompare(b[0]));
    
    // Create legend items
    biomeEntries.forEach(([biomeName, color]) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = color;
        
        const label = document.createElement('div');
        label.className = 'legend-label';
        
        // Capitalize first letter of biome name
        label.textContent = biomeName.charAt(0).toUpperCase() + biomeName.slice(1);
        
        item.appendChild(colorBox);
        item.appendChild(label);
        biomeSection.appendChild(item);
    });
      legendItems.appendChild(biomeSection);
    
    // Add coastline border info
    const borderSection = document.createElement('div');
    borderSection.className = 'legend-section';
    const borderTitle = document.createElement('div');
    borderTitle.className = 'legend-section-title';
    borderTitle.textContent = 'Map Features';
    borderSection.appendChild(borderTitle);
    
    // Add coastline legend item
    const coastlineItem = document.createElement('div');
    coastlineItem.className = 'legend-item';
    
    const borderBox = document.createElement('div');
    borderBox.className = 'legend-color';
    borderBox.style.backgroundColor = '#f5f5f5';
    borderBox.style.border = '1px solid rgba(80, 80, 80, 0.3)';
    
    const borderLabel = document.createElement('div');
    borderLabel.className = 'legend-label';
    borderLabel.textContent = 'Coastline';
    
    coastlineItem.appendChild(borderBox);
    coastlineItem.appendChild(borderLabel);
    borderSection.appendChild(coastlineItem);
    
    legendItems.appendChild(borderSection);
};

// Enhanced cell info display
MapGenerator.prototype.showCellInfo = function(event) {
    // Get mouse position relative to canvas
    var rect = this.canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    
    // Convert screen coordinates to world coordinates (account for zoom and pan)
    var worldX = (x - this.viewState.offsetX) / this.viewState.scale;
    var worldY = (y - this.viewState.offsetY) / this.viewState.scale;

    // Find cell under cursor using world coordinates
    var cell = this.findCell(worldX, worldY);
    if (cell) {
        // Convert wind direction to compass points
        const windDir = this.biomeGen.windPattern.direction;
        const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(((windDir + Math.PI) * 4 / Math.PI + 4) % 8);
        const windDirection = compass[index];

        // Update cell info display
        this.cellInfo.style.display = 'block';
        this.cellInfo.style.left = (event.clientX + 10) + 'px';
        this.cellInfo.style.top = (event.clientY + 10) + 'px';
        
        // Improved info display
        let infoHTML = '';
        
        // Add elevation info first with visual indicator
        const elevPercent = Math.round(cell.elevation * 100);
        infoHTML += `<div class="info-row"><span class="info-label">Elevation:</span><span class="info-value">${elevPercent}%</span></div>`;
        
        // Add terrain type
        if (cell.elevation >= 0.9) {
            infoHTML += `<div class="info-row"><span class="info-label">Terrain:</span><span class="info-value">Snow Peak</span></div>`;
        } else if (cell.elevation >= 0.8) {
            infoHTML += `<div class="info-row"><span class="info-label">Terrain:</span><span class="info-value">High Mountain</span></div>`;
        } else if (cell.elevation >= 0.75) {
            infoHTML += `<div class="info-row"><span class="info-label">Terrain:</span><span class="info-value">Mountain</span></div>`;
        } else if (cell.elevation >= 0.7) {
            infoHTML += `<div class="info-row"><span class="info-label">Terrain:</span><span class="info-value">Foothills</span></div>`;
        } else if (cell.type === 'water') {
            const depthText = cell.elevation < 0.2 ? 'Deep' : cell.elevation < 0.3 ? 'Medium' : 'Shallow';
            infoHTML += `<div class="info-row"><span class="info-label">Type:</span><span class="info-value">Water (${depthText})</span></div>`;
        } else {
            const biomeName = cell.biome.charAt(0).toUpperCase() + cell.biome.slice(1);
            infoHTML += `<div class="info-row"><span class="info-label">Biome:</span><span class="info-value">${biomeName}</span></div>`;
        }
        
        // Add climate info
        infoHTML += `<div class="info-row"><span class="info-label">Temperature:</span><span class="info-value">${cell.temperature.toFixed(1)}°C</span></div>`;
        infoHTML += `<div class="info-row"><span class="info-label">Precipitation:</span><span class="info-value">${cell.precipitation.toFixed(0)} cm/year</span></div>`;
        
        // Add wind info
        infoHTML += `<div class="info-row"><span class="info-label">Wind:</span><span class="info-value">${windDirection} (${(this.biomeGen.windPattern.strength * 100).toFixed(0)}%)</span></div>`;
        
        // Add river info if applicable
        if (cell.isRiver) {
            infoHTML += `<div class="info-row"><span class="info-label">Feature:</span><span class="info-value">River</span></div>`;
        }
        
        this.cellInfo.innerHTML = infoHTML;
    } else {
        this.cellInfo.style.display = 'none';
    }
};

MapGenerator.prototype.findCell = function(x, y) {
    // Find the cell containing the point (x, y)
    for (var i = 0; i < this.cells.length; i++) {
        var cell = this.cells[i];
        if (this.pointInCell(x, y, cell)) {
            return cell;
        }
    }
    return null;
};

MapGenerator.prototype.pointInCell = function(x, y, cell) {
    // Ray casting algorithm to determine if point is in polygon
    var inside = false;
    var j = cell.vertices.length - 1;
    
    for (var i = 0; i < cell.vertices.length; i++) {
        if (((cell.vertices[i].y > y) !== (cell.vertices[j].y > y)) &&
            (x < (cell.vertices[j].x - cell.vertices[i].x) * (y - cell.vertices[i].y) / 
            (cell.vertices[j].y - cell.vertices[i].y) + cell.vertices[i].x)) {
            inside = !inside;
        }
        j = i;
    }
    
    return inside;
};

// Check if a land cell borders water cells
MapGenerator.prototype.cellBordersWater = function(cell) {
    if (cell.type === 'water') return false;
    
    // Check if any neighbors are water
    for (const neighborId of cell.neighbors) {
        const neighbor = this.cells[neighborId];
        if (neighbor && neighbor.type === 'water') {
            return true;
        }
    }
    
    return false;
};

// Zoom in by a fixed amount
MapGenerator.prototype.zoomIn = function() {
    this.zoomAtPoint(1.2, this.canvas.width / 2, this.canvas.height / 2);
};

// Zoom out by a fixed amount
MapGenerator.prototype.zoomOut = function() {
    this.zoomAtPoint(0.8, this.canvas.width / 2, this.canvas.height / 2);
};

// Zoom at a specific point (e.g., mouse position)
MapGenerator.prototype.zoomAtPoint = function(factor, x, y) {
    // Calculate point in world space
    const worldX = (x - this.viewState.offsetX) / this.viewState.scale;
    const worldY = (y - this.viewState.offsetY) / this.viewState.scale;
    
    // Apply zoom factor (with limits)
    const newScale = Math.max(0.2, Math.min(5, this.viewState.scale * factor));
    
    // Only proceed if scale actually changed
    if (newScale !== this.viewState.scale) {
        // Adjust offset to zoom at cursor position
        this.viewState.offsetX = x - worldX * newScale;
        this.viewState.offsetY = y - worldY * newScale;
        this.viewState.scale = newScale;
        
        // Update zoom level display
        this.updateZoomDisplay();
        
        // Redraw
        this.render();
    }
};

// Reset view to original state
MapGenerator.prototype.resetView = function() {
    this.viewState.scale = 1;
    this.viewState.offsetX = 0;
    this.viewState.offsetY = 0;
    this.updateZoomDisplay();
    this.render();
};

// Update zoom level display
MapGenerator.prototype.updateZoomDisplay = function() {
    if (this.zoomLevelDisplay) {
        const percentage = Math.round(this.viewState.scale * 100);
        this.zoomLevelDisplay.textContent = `${percentage}%`;
    }
};

// Initialize template selector
MapGenerator.prototype.initializeTemplateSelector = function() {
    if (!this.templateSelector) return;
    
    const templates = HeightmapTemplates.getTemplateNames();
    this.templateSelector.innerHTML = templates.map(template => 
        `<option value="${template.id}">${template.name}</option>`
    ).join('');
    
    // Update description for initial template
    this.updateTemplateDescription(templates[0].description);
    
    // Add change event listener
    this.templateSelector.addEventListener('change', (e) => {
        const templateId = e.target.value;
        const template = HeightmapTemplates.getTemplate(templateId);
        this.heightmapGen.setTemplate(templateId);
        this.updateTemplateDescription(template.description);
    });
};

// Update template description
MapGenerator.prototype.updateTemplateDescription = function(description) {
    if (this.templateDescription) {
        this.templateDescription.textContent = description;
    }
};

MapGenerator.prototype.generateMap = function() {
    try {
        console.log('Starting map generation');
        
        // Get random template
        const templates = HeightmapTemplates.getTemplateNames();
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        this.heightmapGen.setTemplate(randomTemplate.id);
        
        // Generate the basic map structure using Voronoi
        console.log('Generating Voronoi cells...');
        this.cells = this.voronoiGen.generate();
        console.log(`Generated ${this.cells.length} cells`);
        
        // Generate heightmap using template
        console.log('Generating heightmap...');
        this.cells = this.heightmapGen.generate(this.cells);
        
        // Generate biomes
        console.log('Generating biomes...');
        this.cells = this.biomeGen.generate(this.cells);
        
        // Generate rivers using instance method
        console.log('Generating rivers...');
        this.rivers = this.riverGen.generate(this.cells);
        
        // Render the map
        console.log('Rendering map...');
        this.render();
        console.log('Map generation complete');
        
    } catch (error) {
        console.error('Error in generateMap:', error);
        throw error;
    }
};
