class NoiseGenerator {
    constructor(seed = Math.random()) {
        this.noise2D = createNoise2D();
    }

    // Generate 2D noise value
    generate2D(x, y, scale = 1, octaves = 1, persistence = 0.5, lacunarity = 2) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        // Normalize to 0-1
        return (value / maxValue + 1) / 2;
    }

    // Generate ridge noise for mountain ranges
    generateRidgeNoise(x, y, scale = 1, octaves = 1, persistence = 0.5, lacunarity = 2) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            // Get raw noise value
            const n = this.noise2D(x * frequency, y * frequency);
            
            // Convert to ridge pattern by taking absolute value and inverting
            const ridgeValue = 1 - Math.abs(n);
            
            // Apply square function to create sharper ridges
            const sharpRidge = ridgeValue * ridgeValue;
            
            value += sharpRidge * amplitude;
            maxValue += amplitude;
            
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        // Normalize to 0-1
        return value / maxValue;
    }

    // Generate domain-warped noise for more natural, flowing patterns
    generateWarpedNoise(x, y, scale = 1, warpStrength = 1, octaves = 1) {
        // Generate warping offsets
        const warpX = this.noise2D(x * scale * 0.5, y * scale * 0.5) * warpStrength;
        const warpY = this.noise2D(x * scale * 0.5 + 100, y * scale * 0.5 + 100) * warpStrength;
        
        // Apply warping to coordinates
        const warpedX = x + warpX * 100;
        const warpedY = y + warpY * 100;
        
        // Generate noise with warped coordinates
        return this.generate2D(warpedX, warpedY, scale, octaves);
    }

    // Generate moisture map
    generateMoistureMap(width, height, scale = 0.005) {
        const moistureMap = new Array(width * height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                moistureMap[y * width + x] = this.generate2D(x, y, scale, 4);
            }
        }

        return moistureMap;
    }
}
