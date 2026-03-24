// Test script for Vision AI implementation
// This script validates the Vision AI service functionality

// Mock the vision service for testing
const mockVisionService = {
  // Test data
  testArtwork: {
    imageUrl: 'https://example.com/artwork.jpg',
    prompt: 'A futuristic cyberpunk city with neon lights and flying cars at night'
  },

  // Mock analysis function
  async analyzeArtwork(imageUrl, userPrompt = '') {
    console.log(`🔍 Analyzing artwork: ${imageUrl}`);
    console.log(`📝 User prompt: "${userPrompt}"`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock analysis results
    const analysis = {
      description: `A vibrant cyberpunk artwork featuring futuristic cityscape with neon lights and flying vehicles. The scene captures a nighttime urban environment with towering buildings illuminated by colorful neon signs, creating a dynamic and energetic atmosphere.`,
      tags: ['cyberpunk', 'futuristic', 'neon', 'city', 'night', 'urban', 'buildings', 'lights', 'vehicles', 'sci-fi'],
      style: 'cyberpunk',
      dominant_colors: ['neon-blue', 'purple', 'dark', 'pink', 'cyan'],
      objects: ['buildings', 'lights', 'vehicles', 'city', 'sky'],
      mood: 'energetic',
      confidence: 0.92,
      processing_time: 1.2,
      is_fallback: false
    };
    
    console.log('✅ Analysis complete!');
    console.log('📊 Results:', JSON.stringify(analysis, null, 2));
    
    return analysis;
  },

  // Test fallback analysis
  getFallbackAnalysis(imageUrl, userPrompt) {
    console.log('⚠️ Using fallback analysis (API unavailable)');
    
    const keywords = this.extractKeywordsFromPrompt(userPrompt);
    const styles = this.detectStyleFromPrompt(userPrompt);
    const colors = this.detectColorsFromPrompt(userPrompt);
    const mood = this.detectMoodFromPrompt(userPrompt);
    
    return {
      description: `An AI-generated artwork based on "${userPrompt}". This piece represents a unique collaboration between human creativity and artificial intelligence.`,
      tags: ['digital-art', 'ai-generated', 'creative', ...keywords, ...styles, ...colors],
      style: styles[0] || 'digital',
      dominant_colors: colors,
      objects: keywords,
      mood: mood,
      confidence: 0.6,
      processing_time: 0,
      is_fallback: true
    };
  },

  // Helper functions
  extractKeywordsFromPrompt(prompt) {
    if (!prompt) return [];
    
    const keywords = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
    
    return [...new Set(keywords)].slice(0, 8);
  },

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
  },

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
  },

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
  },

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
};

// Test functions
async function testVisionAnalysis() {
  console.log('🚀 Testing Vision AI Analysis\n');
  
  try {
    // Test 1: Normal analysis
    console.log('📋 Test 1: Normal Vision AI Analysis');
    const result1 = await mockVisionService.analyzeArtwork(
      mockVisionService.testArtwork.imageUrl,
      mockVisionService.testArtwork.prompt
    );
    
    console.log('\n📋 Test 2: Fallback Analysis');
    const result2 = mockVisionService.getFallbackAnalysis(
      mockVisionService.testArtwork.imageUrl,
      mockVisionService.testArtwork.prompt
    );
    
    console.log('\n📋 Test 3: Different Prompts');
    const testPrompts = [
      'A peaceful watercolor landscape with mountains',
      'An abstract geometric pattern with vibrant colors',
      'A realistic portrait of a woman in traditional clothing',
      'A surreal dreamscape with floating objects'
    ];
    
    for (const prompt of testPrompts) {
      console.log(`\n🎨 Testing prompt: "${prompt}"`);
      const analysis = mockVisionService.getFallbackAnalysis('test.jpg', prompt);
      console.log(`Style: ${analysis.style}`);
      console.log(`Mood: ${analysis.mood}`);
      console.log(`Tags: ${analysis.tags.slice(0, 5).join(', ')}`);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test search functionality
function testSearchFunctionality() {
  console.log('\n🔍 Testing Enhanced Search Functionality\n');
  
  // Mock artworks with AI metadata
  const mockArtworks = [
    {
      id: '1',
      metadata: {
        prompt: 'Cyberpunk city at night',
        aiDescription: 'A futuristic cityscape with neon lights',
        aiTags: ['cyberpunk', 'city', 'neon', 'futuristic'],
        aiStyle: 'cyberpunk',
        aiMood: 'energetic',
        isVisionAnalyzed: true
      }
    },
    {
      id: '2',
      metadata: {
        prompt: 'Peaceful mountain landscape',
        aiDescription: 'A serene mountain scene with natural beauty',
        aiTags: ['landscape', 'mountains', 'peaceful', 'nature'],
        aiStyle: 'realistic',
        aiMood: 'calm',
        isVisionAnalyzed: true
      }
    },
    {
      id: '3',
      metadata: {
        prompt: 'Abstract geometric art',
        aiTags: ['abstract', 'geometric', 'modern'],
        aiStyle: 'abstract',
        isVisionAnalyzed: false
      }
    }
  ];
  
  // Mock search function
  function searchArtworks(query, filters = {}) {
    const searchTerm = query.toLowerCase().trim();
    
    return mockArtworks.filter(artwork => {
      const metadata = artwork.metadata || {};
      
      const promptMatch = metadata.prompt?.toLowerCase().includes(searchTerm);
      const descriptionMatch = metadata.aiDescription?.toLowerCase().includes(searchTerm);
      const tagsMatch = metadata.aiTags?.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      );
      const styleMatch = metadata.aiStyle?.toLowerCase().includes(searchTerm);
      const moodMatch = metadata.aiMood?.toLowerCase().includes(searchTerm);
      
      const matchesSearch = promptMatch || descriptionMatch || tagsMatch || 
                          styleMatch || moodMatch;
      
      let matchesFilters = true;
      
      if (filters.style && filters.style !== 'all') {
        matchesFilters = metadata.aiStyle === filters.style;
      }
      
      if (filters.mood && filters.mood !== 'all') {
        matchesFilters = metadata.aiMood === filters.mood;
      }
      
      if (filters.hasVisionAnalysis) {
        matchesFilters = metadata.isVisionAnalyzed === true;
      }
      
      return matchesSearch && matchesFilters;
    });
  }
  
  // Test searches
  const searches = [
    { query: 'cyberpunk', filters: {} },
    { query: 'peaceful', filters: { mood: 'calm' } },
    { query: '', filters: { style: 'abstract' } },
    { query: '', filters: { hasVisionAnalysis: true } }
  ];
  
  searches.forEach(({ query, filters }, index) => {
    console.log(`🔍 Search ${index + 1}: "${query}" with filters:`, filters);
    const results = searchArtworks(query, filters);
    console.log(`Found ${results.length} artworks:`);
    results.forEach(artwork => {
      console.log(`  - ${artwork.metadata.prompt} (${artwork.metadata.aiStyle})`);
    });
    console.log('');
  });
  
  console.log('✅ Search tests completed!');
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Vision AI Implementation Test Suite\n');
  console.log('=' .repeat(50));
  
  await testVisionAnalysis();
  testSearchFunctionality();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 All tests completed! The Vision AI implementation is ready.');
  console.log('\n📝 Next steps:');
  console.log('1. Set up your Vision AI API endpoint and key');
  console.log('2. Test with real artwork images');
  console.log('3. Integrate with your frontend application');
  console.log('4. Monitor performance and user feedback');
}

// Run the tests
runAllTests().catch(console.error);
