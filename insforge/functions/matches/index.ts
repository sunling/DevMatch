// Skill categories for complementary scoring
const SKILL_CATEGORIES: Record<string, string[]> = {
  frontend: ['React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind', 'Next.js'],
  backend: ['Node.js', 'Python', 'Django', 'Go', 'Java', 'Ruby', 'PostgreSQL', 'MongoDB', 'Redis'],
  devops: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'GitHub Actions'],
  mobile: ['Swift', 'Kotlin', 'React Native', 'Flutter', 'iOS', 'Android'],
  gamedev: ['Unity', 'C#', 'Unreal Engine', 'AR/VR', 'Game Development'],
  ai: ['TensorFlow', 'PyTorch', 'Machine Learning', 'AI', 'OpenAI']
};

function getSkillCategory(skill: string): string | null {
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.includes(skill)) return category;
  }
  return null;
}

function areComplementary(skill1: string, skill2: string): boolean {
  const cat1 = getSkillCategory(skill1);
  const cat2 = getSkillCategory(skill2);
  if (!cat1 || !cat2) return false;
  return cat1 !== cat2;
}

interface User {
  id: string;
  github_id: string;
  name: string;
  avatar_url: string;
  bio: string;
  location: string;
  html_url: string;
}

interface Skill {
  skill_name: string;
  skill_count: number;
}

interface Personality {
  type: string;
  title: string;
  description: string;
  rarity: string;
}

interface MatchResult {
  userId: string;
  name: string;
  avatar: string;
  bio: string;
  location: string;
  htmlUrl: string;
  skills: string[];
  matchScore: number;
  sharedSkills: string[];
  personality: Personality;
}

export default async function(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', details: 'Request body must be valid JSON with userId field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { userId, eventId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user's skills via REST API
    const baseUrl = Deno.env.get('INSFORGE_INTERNAL_URL') || 'http://localhost:8080';
    const apiKey = Deno.env.get('API_KEY') || '';
    
    const skillsResponse = await fetch(`${baseUrl}/api/database/records/skills?select=skill_name,skill_count&user_id=eq.${userId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!skillsResponse.ok) {
      const errorText = await skillsResponse.text();
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user skills', status: skillsResponse.status, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const currentUserSkills = await skillsResponse.json();

    // If user has no skills, return empty matches (new user case)
    if (!currentUserSkills || currentUserSkills.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: 'No skills found. Please analyze your GitHub profile first.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentUserSkillNames = currentUserSkills.map((s: Skill) => s.skill_name);

    // Get current user's location
    const userResponse = await fetch(`${baseUrl}/api/database/records/users?select=location&id=eq.${userId}&limit=1`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user', status: userResponse.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const currentUserData = await userResponse.json();
    const currentUser = currentUserData[0];

    if (!currentUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentUserLocation = currentUser.location;

    // Get all other users with personality (optionally scoped to event participants)
    let userFilter = `id=neq.${userId}`;
    
    if (eventId) {
      // Fetch participant user IDs for this event
      const participantsResponse = await fetch(
        `${baseUrl}/api/database/records/event_participants?select=user_id&event_id=eq.${eventId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const participants = participantsResponse.ok ? await participantsResponse.json() : [];
      const participantUserIds = participants
        .map((p: any) => p.user_id)
        .filter((id: string) => id !== userId);
      
      if (participantUserIds.length === 0) {
        return new Response(
          JSON.stringify({ matches: [], message: 'No other participants in this event yet.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userFilter = `id=in.(${participantUserIds.join(',')})`;
    }

    const usersResponse = await fetch(`${baseUrl}/api/database/records/users?select=id,github_id,name,avatar_url,bio,location,html_url,personality_type,personality_title,personality_description,personality_rarity&${userFilter}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!usersResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', status: usersResponse.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const allUsers = await usersResponse.json();

    if (!allUsers || allUsers.length === 0) {
      return new Response(
        JSON.stringify({ matches: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch skills for all users
    const allSkillsResponse = await fetch(`${baseUrl}/api/database/records/skills?select=user_id,skill_name,skill_count`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const allSkills = allSkillsResponse.ok ? await allSkillsResponse.json() : [];
    
    // Group skills by user
    const skillsByUser: Record<string, Skill[]> = {};
    for (const skill of allSkills) {
      if (!skillsByUser[skill.user_id]) {
        skillsByUser[skill.user_id] = [];
      }
      skillsByUser[skill.user_id].push(skill);
    }

    // Calculate match scores
    const matches: MatchResult[] = allUsers.map((user: any) => {
      const userSkills: Skill[] = skillsByUser[user.id] || [];
      const userSkillNames = userSkills.map((s: Skill) => s.skill_name);

      // Find shared skills
      const sharedSkills = userSkillNames.filter((skill: string) =>
        currentUserSkillNames.includes(skill)
      );

      // Find complementary skills
      let complementaryScore = 0;
      for (const skill1 of currentUserSkillNames) {
        for (const skill2 of userSkillNames) {
          if (areComplementary(skill1, skill2)) {
            complementaryScore += 10;
          }
        }
      }

      // Location bonus
      const locationBonus = user.location === currentUserLocation && user.location !== 'Remote' ? 10 : 0;

      // Calculate total score
      const sharedScore = sharedSkills.length * 15;
      const totalScore = sharedScore + complementaryScore + locationBonus;

      return {
        userId: user.id,
        name: user.name,
        avatar: user.avatar_url,
        bio: user.bio,
        location: user.location,
        htmlUrl: user.html_url,
        skills: userSkillNames.slice(0, 3), // Top 3 skills
        matchScore: totalScore,
        sharedSkills: sharedSkills,
        personality: {
          type: user.personality_type,
          title: user.personality_title,
          description: user.personality_description,
          rarity: user.personality_rarity
        }
      };
    });

    // Sort by score and return top 10
    const topMatches = matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    return new Response(
      JSON.stringify({ matches: topMatches }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
