// Vision AI Service for automatic art analysis and tag generation
// This service uses computer vision models to analyze artwork and generate descriptions/tags

class VisionService {
  constructor() {
    this.apiEndpoint = process.env.REACT_APP_VISION_API_ENDPOINT || 'https://api.muse.art/vision';
    this.apiKey = process.env.REACT_APP_VISION_API_KEY || 'demo-key';
  }

  /**
   * Analyze artwork image and generate description and tags
   * @param {string} imageUrl - URL of the artwork image
   * @param {string} userPrompt - Original user prompt for context
   * @returns {Promise<Object>} - Analysis results with description and tags
   */
  async analyzeArtwork(imageUrl, userPrompt = '') {
    try {
      const response = await fetch(`${this.apiEndpoint}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: userPrompt,
          analysis_type: 'artwork',
          features: ['description', 'tags', 'style', 'objects', 'colors', 'mood']
        })
      });

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.status}`);
      }

      const data = await response.json();
      return this.formatAnalysisResults(data);
    } catch (error) {
      console.error('Vision analysis failed:', error);
      // Return fallback analysis for demo purposes
      return this.getFallbackAnalysis(imageUrl, userPrompt);
    }
  }

  /**
   * Format analysis results from API response
   * @param {Object} data - Raw API response
   * @returns {Object} - Formatted analysis results
   */
  formatAnalysisResults(data) {
    return {
      description: data.description || this.generateDescription(data),
      tags: this.extractTags(data),
      style: data.style || 'unknown',
      dominant_colors: data.colors || [],
      objects: data.objects || [],
      mood: data.mood || 'neutral',
      confidence: data.confidence || 0.8,
      processing_time: data.processing_time || 0
    };
  }

  /**
   * Extract and normalize tags from analysis data
   * @param {Object} data - Analysis data
   * @returns {Array} - Normalized tags array
   */
  extractTags(data) {
    const tags = new Set();

    // Add style tags
    if (data.style) {
      tags.add(data.style.toLowerCase());
    }

    // Add object tags
    if (data.objects && Array.isArray(data.objects)) {
      data.objects.forEach(obj => {
        if (typeof obj === 'string') {
          tags.add(obj.toLowerCase());
        } else if (obj.name) {
          tags.add(obj.name.toLowerCase());
        }
      });
    }

    // Add mood tags
    if (data.mood) {
      tags.add(data.mood.toLowerCase());
    }

    // Add explicit tags
    if (data.tags && Array.isArray(data.tags)) {
      data.tags.forEach(tag => tags.add(tag.toLowerCase()));
    }

    // Add color tags
    if (data.colors && Array.isArray(data.colors)) {
      data.colors.forEach(color => {
        if (typeof color === 'string') {
          tags.add(color.toLowerCase());
        } else if (color.name) {
          tags.add(color.name.toLowerCase());
        }
      });
    }

    return Array.from(tags).slice(0, 15); // Limit to 15 tags
  }

  /**
   * Generate description from analysis components
   * @param {Object} data - Analysis data
   * @returns {string} - Generated description
   */
  generateDescription(data) {
    const parts = [];

    // Style description
    if (data.style) {
      parts.push(`A ${data.style} artwork`);
    }

    // Object descriptions
    if (data.objects && data.objects.length > 0) {
      const objectNames = data.objects
        .map(obj => typeof obj === 'string' ? obj : obj.name)
        .slice(0, 3)
        .join(', ');
      parts.push(`featuring ${objectNames}`);
    }

    // Color description
    if (data.colors && data.colors.length > 0) {
      const colorNames = data.colors
        .map(color => typeof color === 'string' ? color : color.name)
        .slice(0, 3)
        .join(', ');
      parts.push(`with ${colorNames} tones`);
    }

    // Mood description
    if (data.mood && data.mood !== 'neutral') {
      parts.push(`evoking a ${data.mood} atmosphere`);
    }

    return parts.join(' ') + '.';
  }

  /**
   * Fallback analysis when API is unavailable (for demo purposes)
   * @param {string} imageUrl - Image URL
   * @param {string} userPrompt - User prompt
   * @returns {Object} - Fallback analysis results
   */
  getFallbackAnalysis(imageUrl, userPrompt) {
    // Extract potential keywords from user prompt
    const promptKeywords = this.extractKeywordsFromPrompt(userPrompt);
    
    // Generate basic tags based on common art categories
    const baseTags = ['digital-art', 'ai-generated', 'creative'];
    const styleTags = this.detectStyleFromPrompt(userPrompt);
    const colorTags = this.detectColorsFromPrompt(userPrompt);
    
    return {
      description: `An AI-generated artwork ${userPrompt ? `based on "${userPrompt}"` : ''}. ` +
                   `This piece represents a unique collaboration between human creativity and artificial intelligence.`,
      tags: [...baseTags, ...styleTags, ...colorTags, ...promptKeywords].slice(0, 12),
      style: styleTags[0] || 'digital',
      dominant_colors: colorTags.slice(0, 3),
      objects: promptKeywords.slice(0, 3),
      mood: this.detectMoodFromPrompt(userPrompt),
      confidence: 0.6,
      processing_time: 0,
      is_fallback: true
    };
  }

  /**
   * Extract keywords from user prompt
   * @param {string} prompt - User prompt
   * @returns {Array} - Extracted keywords
   */
  extractKeywordsFromPrompt(prompt) {
    if (!prompt) return [];
    
    const keywords = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
    
    return [...new Set(keywords)].slice(0, 8);
  }

  /**
   * Detect art style from prompt
   * @param {string} prompt - User prompt
   * @returns {Array} - Style tags
   */
  detectStyleFromPrompt(prompt) {
    if (!prompt) return [];
    
    const styleMap = {
      'cyberpunk': ['cyberpunk', 'futuristic', 'sci-fi'],
      'realistic': ['realistic', 'photorealistic', 'realism'],
      'abstract': ['abstract', 'geometric', 'non-representational'],
      'surreal': ['surreal', 'dreamlike', 'fantasy'],
      'anime': ['anime', 'manga', 'japanese'],
      'watercolor': ['watercolor', 'painting', 'traditional'],
      'oil-painting': ['oil painting', 'classical', 'traditional'],
      'cartoon': ['cartoon', 'animated', 'stylized'],
      '3d-render': ['3d', 'render', 'cgi'],
      'minimalist': ['minimalist', 'simple', 'clean']
    };

    const styles = [];
    const lowerPrompt = prompt.toLowerCase();
    
    Object.entries(styleMap).forEach(([style, keywords]) => {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        styles.push(style);
      }
    });
    
    return styles.length > 0 ? styles : ['digital'];
  }

  /**
   * Detect colors from prompt
   * @param {string} prompt - User prompt
   * @returns {Array} - Color tags
   */
  detectColorsFromPrompt(prompt) {
    if (!prompt) return [];
    
    const colors = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 
      'black', 'white', 'gray', 'brown', 'gold', 'silver', 'neon',
      'vibrant', 'pastel', 'dark', 'light', 'warm', 'cool'
    ];
    
    const foundColors = [];
    const lowerPrompt = prompt.toLowerCase();
    
    colors.forEach(color => {
      if (lowerPrompt.includes(color)) {
        foundColors.push(color);
      }
    });
    
    return foundColors;
  }

  /**
   * Detect mood from prompt
   * @param {string} prompt - User prompt
   * @returns {string} - Mood
   */
  detectMoodFromPrompt(prompt) {
    if (!prompt) return 'neutral';
    
    const moodMap = {
      'happy': ['happy', 'joyful', 'cheerful', 'bright', 'sunny'],
      'sad': ['sad', 'melancholy', 'somber', 'dark', 'gloomy'],
      'energetic': ['energetic', 'dynamic', 'vibrant', 'exciting', 'bold'],
      'calm': ['calm', 'peaceful', 'serene', 'quiet', 'gentle'],
      'mysterious': ['mysterious', 'enigmatic', 'dark', 'hidden', 'secret'],
      'dramatic': ['dramatic', 'intense', 'powerful', 'strong', 'epic']
    };
    
    const lowerPrompt = prompt.toLowerCase();
    
    for (const [mood, keywords] of Object.entries(moodMap)) {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        return mood;
      }
    }
    
    return 'neutral';
  }

  /**
   * Check if word is a stop word
   * @param {string} word - Word to check
   * @returns {boolean} - True if stop word
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    
    return stopWords.has(word);
  }

  /**
   * Batch analyze multiple artworks
   * @param {Array} artworks - Array of artwork objects with imageUrl and prompt
   * @returns {Promise<Array>} - Array of analysis results
   */
  async batchAnalyze(artworks) {
    const results = [];
    
    for (const artwork of artworks) {
      try {
        const analysis = await this.analyzeArtwork(artwork.imageUrl, artwork.prompt);
        results.push({
          id: artwork.id,
          analysis,
          success: true
        });
      } catch (error) {
        console.error(`Failed to analyze artwork ${artwork.id}:`, error);
        results.push({
          id: artwork.id,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }
}

// Create singleton instance
const visionService = new VisionService();

export default visionService;
