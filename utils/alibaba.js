const axios = require('axios');

/**
 * Generate image using Alibaba/NIM API
 * @param {string} model - Model name to use
 * @param {string} prompt - The prompt text
 * @param {string} imageData - Base64 image data for editing
 * @param {string} negativePrompt - Negative prompt (optional)
 * @param {number} guidanceScale - Guidance scale (default: 7.5)
 * @param {number} steps - Number of steps (default: 30)
 * @returns {Promise<{imageUrl: string}>} - Generated image URL
 */
async function generateImage(model, prompt, imageData, negativePrompt = null, guidanceScale = 7.5, steps = 30) {
    try {
        // Check if NIM API key is configured
        const apiKey = process.env.NIM_API_KEY;
        const endpoint = process.env.NIM_ENDPOINT || 'https://api.nim.com/v1/generate';
        
        if (!apiKey) {
            // Fallback to mock generation for testing
            console.warn('NIM_API_KEY not configured, using mock generation');
            return mockGenerateImage(prompt);
        }
        
        // Prepare request payload
        const payload = {
            model: model || 'qwen-image-2.0-pro',
            prompt: prompt,
            negative_prompt: negativePrompt || undefined,
            guidance_scale: guidanceScale || 7.5,
            steps: steps || 30,
            image: imageData ? imageData.split(',')[1] : undefined // Remove data URL prefix
        };
        
        // Remove undefined fields
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
        
        const response = await axios.post(endpoint, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2 minute timeout
        });
        
        if (response.data && response.data.image_url) {
            return { imageUrl: response.data.image_url };
        } else if (response.data && response.data.data && response.data.data.url) {
            return { imageUrl: response.data.data.url };
        } else {
            throw new Error('No image URL returned from API');
        }
    } catch (error) {
        console.error('NIM API error:', error.response?.data || error.message);
        
        // If API fails, fallback to mock
        console.warn('Falling back to mock generation');
        return mockGenerateImage(prompt);
    }
}

/**
 * Mock image generation for testing when API is not available
 */
function mockGenerateImage(prompt) {
    // Generate a placeholder image URL with a random color
    const colors = ['667eea', '764ba2', '34a853', 'ea4335', 'fbbc05', '4285f4', 'ff6b6b', '4ecdc4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomColor2 = colors[Math.floor(Math.random() * colors.length)];
    
    // Create a gradient placeholder
    const width = 800;
    const height = 600;
    const text = encodeURIComponent(prompt.substring(0, 30) + '...');
    
    // Using a placeholder service that supports gradients
    const placeholderUrl = `https://via.placeholder.com/${width}x${height}/${randomColor}/${randomColor2}?text=${text}`;
    
    console.log(`Mock generated image for prompt: "${prompt.substring(0, 50)}..."`);
    
    return { 
        imageUrl: placeholderUrl,
        isMock: true 
    };
}

module.exports = { generateImage };
