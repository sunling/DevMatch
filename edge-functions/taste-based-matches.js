// Taste-Based Matching Algorithm for Vision-Value Alignment
// This function calculates compatibility based on behavioral signals, not just skills

const COMPLEMENTARY_ARCHETYPES = {
  visionary: ['polisher', 'systems-thinker', 'prompt-architect'],
  polisher: ['visionary', 'vibe-curator', 'prompt-architect'],
  connector: ['visionary', 'systems-thinker'],
  'systems-thinker': ['visionary', 'connector', 'prompt-architect'],
  'vibe-curator': ['polisher', 'visionary'],
  'prompt-architect': ['polisher', 'systems-thinker', 'visionary'],
};

const DOMAIN_WEIGHTS = {
  'climate-tech': 1.2,
  'web3': 1.0,
  'indie-games': 1.1,
  'ai-ml': 1.3,
  'social-impact': 1.2,
  'dev-tools': 1.0,
  'creative-coding': 1.1,
  'health-fitness': 1.0,
  'education': 1.1,
  'fintech': 1.0,
  'productivity': 1.0,
  'open-source': 1.1,
};

export default async function(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const baseUrl = Deno.env.get('INSFORGE_INTERNAL_URL') || 'http://localhost:8080';
    const apiKey = Deno.env.get('API_KEY') || '';

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch current user's full profile
    const userResponse = await fetch(
      `${baseUrl}/api/database/records/users?id=eq.${userId}&select=*`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    const users = await userResponse.json();
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const currentUser = users[0];

    // Fetch user's taste profile
    const tasteResponse = await fetch(
      `${baseUrl}/api/database/records/user_taste_profiles?user_id=eq.${userId}&select=*`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    const tasteProfiles = await tasteResponse.json();
    const tasteProfile = tasteProfiles && tasteProfiles.length > 0 ? tasteProfiles[0] : null;

    // Fetch user's vibe check responses
    const vibeResponse = await fetch(
      `${baseUrl}/api/database/records/vibe_check_responses?user_id=eq.${userId}&select=*`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    const vibeChecks = await vibeResponse.json();
    const vibeCheck = vibeChecks && vibeChecks.length > 0 ? vibeChecks[0] : null;

    // Fetch all other users with their profiles
    const allUsersResponse = await fetch(
      `${baseUrl}/api/database/records/users?id=neq.${userId}&select=*`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    const allUsers = await allUsersResponse.json() || [];

    // Calculate matches
    const matches = [];

    for (const otherUser of allUsers) {
      // Fetch other user's taste profile
      const otherTasteResponse = await fetch(
        `${baseUrl}/api/database/records/user_taste_profiles?user_id=eq.${otherUser.id}&select=*`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const otherTasteProfiles = await otherTasteResponse.json();
      const otherTaste = otherTasteProfiles && otherTasteProfiles.length > 0 ? otherTasteProfiles[0] : null;

      // Fetch other user's vibe check
      const otherVibeResponse = await fetch(
        `${baseUrl}/api/database/records/vibe_check_responses?user_id=eq.${otherUser.id}&select=*`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const otherVibeChecks = await otherVibeResponse.json();
      const otherVibe = otherVibeChecks && otherVibeChecks.length > 0 ? otherVibeChecks[0] : null;

      // Calculate compatibility score
      const score = calculateCompatibility(
        currentUser,
        tasteProfile,
        vibeCheck,
        otherUser,
        otherTaste,
        otherVibe
      );

      if (score.total > 30) { // Minimum threshold
        matches.push({
          userId: otherUser.id,
          name: otherUser.name,
          avatar: otherUser.avatar_url,
          bio: otherUser.bio,
          location: otherUser.location,
          htmlUrl: otherUser.html_url,
          archetype: otherUser.archetype,
          domainInterests: otherUser.domain_interests || [],
          matchScore: Math.round(score.total),
          breakdown: score.breakdown,
          vibeResponses: otherVibe ? otherVibe.responses : null,
          digitalDNA: otherTaste ? {
            velocity: otherTaste.taste_signals?.velocity_score,
            collaboration: otherTaste.taste_signals?.collaboration_score,
            readme: otherTaste.taste_signals?.readme_score,
            builder: otherTaste.builder_archetype,
            curiosity: otherTaste.taste_signals?.curiosity_areas?.slice(0, 2),
          } : null,
        });
      }
    }

    // Sort by score and return top matches
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return new Response(
      JSON.stringify({ 
        matches: matches.slice(0, 10),
        userSignals: tasteProfile ? {
          velocity: tasteProfile.taste_signals?.velocity_score,
          collaboration: tasteProfile.taste_signals?.collaboration_score,
          builder: tasteProfile.builder_archetype,
        } : null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Taste matching error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function calculateCompatibility(user1, taste1, vibe1, user2, taste2, vibe2) {
  const breakdown = {};
  let totalScore = 0;

  // 1. Domain Interest Overlap (20%)
  const domains1 = user1.domain_interests || [];
  const domains2 = user2.domain_interests || [];
  const sharedDomains = domains1.filter(d => domains2.includes(d));
  
  let domainScore = 0;
  if (sharedDomains.length > 0) {
    // Weight by domain importance
    const domainWeight = sharedDomains.reduce((sum, d) => 
      sum + (DOMAIN_WEIGHTS[d] || 1.0), 0
    ) / sharedDomains.length;
    domainScore = (sharedDomains.length / Math.max(domains1.length, domains2.length)) * 100 * domainWeight;
  }
  breakdown.domain = Math.round(domainScore * 0.20);
  totalScore += breakdown.domain;

  // 2. Archetype Complementarity (20%)
  let archetypeScore = 0;
  let synergyType = "neutral";
  
  if (user1.archetype && user2.archetype) {
    if (user1.archetype === user2.archetype) {
      archetypeScore = 40; // Same archetype - some overlap
      synergyType = "similar";
    } else if (COMPLEMENTARY_ARCHETYPES[user1.archetype]?.includes(user2.archetype)) {
      archetypeScore = 100; // Perfect complement
      synergyType = "complementary";
    } else if (COMPLEMENTARY_ARCHETYPES[user2.archetype]?.includes(user1.archetype)) {
      archetypeScore = 100;
      synergyType = "complementary";
    } else {
      archetypeScore = 60; // Neutral
      synergyType = "neutral";
    }
  }
  breakdown.archetype = Math.round(archetypeScore * 0.20);
  totalScore += breakdown.archetype;

  // 3. Velocity Compatibility (15%)
  let velocityScore = 0;
  if (taste1 && taste2) {
    const v1 = taste1.taste_signals?.velocity_score || 50;
    const v2 = taste2.taste_signals?.velocity_score || 50;
    const diff = Math.abs(v1 - v2);
    
    // Similar velocity is good, but complementary also works
    if (diff < 20) {
      velocityScore = 100; // Similar pace
    } else if (diff < 40) {
      velocityScore = 70; // Different but manageable
    } else {
      velocityScore = 40; // Very different - potential friction
    }
  } else {
    velocityScore = 50; // Unknown
  }
  breakdown.velocity = Math.round(velocityScore * 0.15);
  totalScore += breakdown.velocity;

  // 4. Collaboration Style Match (15%)
  let collaborationScore = 0;
  if (taste1 && taste2) {
    const c1 = taste1.taste_signals?.collaboration_score || 50;
    const c2 = taste2.taste_signals?.collaboration_score || 50;
    const diff = Math.abs(c1 - c2);
    
    // Similar collaboration style is usually better
    collaborationScore = Math.max(0, 100 - diff);
  } else {
    collaborationScore = 50;
  }
  breakdown.collaboration = Math.round(collaborationScore * 0.15);
  totalScore += breakdown.collaboration;

  // 5. Builder Philosophy Alignment (15%)
  let builderScore = 0;
  if (taste1 && taste2) {
    const b1 = taste1.builder_archetype;
    const b2 = taste2.builder_archetype;
    
    // Some combinations work well
    const goodCombos = [
      ['hacker', 'architect'],
      ['craftsman', 'perfectionist'],
      ['hacker', 'craftsman'],
    ];
    
    if (b1 === b2) {
      builderScore = 70; // Same style
    } else if (goodCombos.some(c => 
      (c[0] === b1 && c[1] === b2) || (c[0] === b2 && c[1] === b1)
    )) {
      builderScore = 90; // Complementary styles
    } else {
      builderScore = 50; // Neutral
    }
  } else {
    builderScore = 50;
  }
  breakdown.builder = Math.round(builderScore * 0.15);
  totalScore += breakdown.builder;

  // 6. Vibe Check Alignment (15%) - Compare actual answers
  let vibeScore = calculateVibeCompatibility(vibe1, vibe2);
  breakdown.vibe = Math.round(vibeScore * 0.15);
  totalScore += breakdown.vibe;

  // 7. Digital DNA Deep Signals (10%) - README quality, completion tendency, curiosity
  let dnaScore = calculateDNAScore(taste1, taste2);
  breakdown.dna = Math.round(dnaScore * 0.10);
  totalScore += breakdown.dna;

  return {
    total: totalScore,
    breakdown,
    synergyType,
  };
}

// Calculate compatibility based on vibe check answers
function calculateVibeCompatibility(vibe1, vibe2) {
  if (!vibe1?.responses || !vibe2?.responses) {
    return 50; // Neutral if no data
  }

  const r1 = vibe1.responses;
  const r2 = vibe2.responses;
  
  let matches = 0;
  let totalQuestions = 0;

  // Compare each question's answer
  const questions = ['boring-problem', 'team-role', 'time-horizon', 'overhyped-tech', 'collaboration-style'];
  
  for (const q of questions) {
    if (r1[q] && r2[q]) {
      totalQuestions++;
      
      // Exact match = high compatibility
      if (r1[q] === r2[q]) {
        matches += 1;
      } 
      // Some combinations are complementary
      else if (areComplementaryAnswers(q, r1[q], r2[q])) {
        matches += 0.8;
      }
      // Neutral difference
      else {
        matches += 0.3;
      }
    }
  }

  if (totalQuestions === 0) return 50;
  return (matches / totalQuestions) * 100;
}

// Check if two answers are complementary (different but work well together)
function areComplementaryAnswers(question, answer1, answer2) {
  const complementaryPairs = {
    'team-role': [
      ['breaks', 'protects'], // Mover + Stabilizer
      ['designs', 'connects'], // Architect + Connector
    ],
    'time-horizon': [
      ['ship-week', 'ship-months'], // Fast + Polished complement
    ],
    'collaboration-style': [
      ['async-focused', 'fast-fun'], // Different but can work
      ['thoughtful-kind', 'ambitious-challenging'], // Supportive + Growth
    ],
  };

  const pairs = complementaryPairs[question] || [];
  return pairs.some(pair => 
    (pair[0] === answer1 && pair[1] === answer2) ||
    (pair[0] === answer2 && pair[1] === answer1)
  );
}

// Calculate Digital DNA compatibility
function calculateDNAScore(taste1, taste2) {
  if (!taste1?.taste_signals || !taste2?.taste_signals) {
    return 50;
  }

  const s1 = taste1.taste_signals;
  const s2 = taste2.taste_signals;

  let score = 0;
  let factors = 0;

  // README quality alignment (both care about docs)
  if (s1.readme_score !== undefined && s2.readme_score !== undefined) {
    const readmeDiff = Math.abs(s1.readme_score - s2.readme_score);
    score += Math.max(0, 100 - readmeDiff);
    factors++;
  }

  // Completion tendency (both finishers or both experimenters)
  if (s1.completion_score !== undefined && s2.completion_score !== undefined) {
    const completionDiff = Math.abs(s1.completion_score - s2.completion_score);
    score += Math.max(0, 100 - completionDiff);
    factors++;
  }

  // Curiosity overlap (shared interest areas)
  if (s1.curiosity_areas && s2.curiosity_areas) {
    const shared = s1.curiosity_areas.filter(a => s2.curiosity_areas.includes(a));
    const total = new Set([...s1.curiosity_areas, ...s2.curiosity_areas]).size;
    score += total > 0 ? (shared.length / total) * 100 : 50;
    factors++;
  }

  // Builder archetype complementarity
  const builderCombos = {
    'hacker': ['architect', 'perfectionist'],
    'craftsman': ['perfectionist', 'hacker'],
    'architect': ['hacker', 'craftsman'],
    'perfectionist': ['craftsman', 'architect'],
  };

  if (taste1.builder_archetype && taste2.builder_archetype) {
    if (taste1.builder_archetype === taste2.builder_archetype) {
      score += 70; // Same style
    } else if (builderCombos[taste1.builder_archetype]?.includes(taste2.builder_archetype)) {
      score += 90; // Complementary
    } else {
      score += 50; // Neutral
    }
    factors++;
  }

  return factors > 0 ? score / factors : 50;
}
