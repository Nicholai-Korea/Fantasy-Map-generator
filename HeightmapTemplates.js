// HeightmapTemplates.js
var HeightmapTemplates = {
    // Each template contains noise parameters and transformation functions
    // to create specific landmass shapes
    templates: {
        random: {
            name: "Random",
            description: "Completely random terrain generation",
            // Default parameters (same as current)
            continentScale: 0.002,
            mountainScale: 0.006,
            detailScale: 0.015,
            continentWeight: 0.6,
            mountainWeight: 0.3,
            detailWeight: 0.1,
            // No specific transformation
            transform: function(x, y, width, height) {
                return { x, y };
            }
        },
        europe: {
            name: "Europe-like",
            description: "Continent with varied coastline and peninsulas",
            continentScale: 0.0018,
            mountainScale: 0.007,
            detailScale: 0.015,
            continentWeight: 0.65,
            mountainWeight: 0.25,
            detailWeight: 0.1,
            // Transform coordinates to create Europe-like shape
            transform: function(x, y, width, height) {
                // Shift and scale to create characteristic European shape
                const centerX = width * 0.6;  // Shift east
                const centerY = height * 0.4;  // Shift north
                
                // Calculate distance from center
                const dx = x - centerX;
                const dy = y - centerY;
                
                // Warp coordinates to create characteristic peninsulas
                const warpedX = x + Math.sin(y / height * Math.PI) * 50;
                const warpedY = y + Math.cos(x / width * Math.PI * 0.5) * 30;
                
                return { x: warpedX, y: warpedY };
            }
        },
        asia: {
            name: "Asia-like",
            description: "Large landmass with varied terrain",
            continentScale: 0.0015,
            mountainScale: 0.008,
            detailScale: 0.02,
            continentWeight: 0.7,
            mountainWeight: 0.2,
            detailWeight: 0.1,
            transform: function(x, y, width, height) {
                const centerX = width * 0.7;
                const centerY = height * 0.5;
                
                // Create characteristic Asian continent shape
                const warpedX = x + Math.sin(y / height * Math.PI * 2) * 40;
                const warpedY = y + Math.cos(x / width * Math.PI) * 60;
                
                return { x: warpedX, y: warpedY };
            }
        },
        pangaea: {
            name: "Pangaea-like",
            description: "Single large supercontinent",
            continentScale: 0.0012,
            mountainScale: 0.006,
            detailScale: 0.018,
            continentWeight: 0.75,
            mountainWeight: 0.15,
            detailWeight: 0.1,
            transform: function(x, y, width, height) {
                const centerX = width * 0.5;
                const centerY = height * 0.5;
                
                // Create a more cohesive landmass
                const angle = Math.atan2(y - centerY, x - centerX);
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                
                // Add some natural variation to the supercontinent
                const warpedX = x + Math.sin(angle * 2) * distance * 0.2;
                const warpedY = y + Math.cos(angle * 3) * distance * 0.15;
                
                return { x: warpedX, y: warpedY };
            }
        },
        archipelago: {
            name: "Archipelago",
            description: "Scattered island chains",
            continentScale: 0.003,
            mountainScale: 0.009,
            detailScale: 0.02,
            continentWeight: 0.45,
            mountainWeight: 0.35,
            detailWeight: 0.2,
            transform: function(x, y, width, height) {
                // Create island chain patterns
                const warpedX = x + Math.sin(y / 100) * 30 + Math.sin(y / 50) * 15;
                const warpedY = y + Math.cos(x / 120) * 25 + Math.cos(x / 60) * 10;
                
                return { x: warpedX, y: warpedY };
            }
        }
    },

    // Get a list of available templates
    getTemplateNames: function() {
        return Object.keys(this.templates).map(key => ({
            id: key,
            name: this.templates[key].name,
            description: this.templates[key].description
        }));
    },

    // Get a specific template
    getTemplate: function(templateId) {
        return this.templates[templateId] || this.templates.random;
    }
};
