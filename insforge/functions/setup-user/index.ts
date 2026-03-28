// This function is called after GitHub OAuth to save user data and generate skills
// It should be called from the frontend after successful login

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  html_url: string;
}

interface GitHubRepo {
  name: string;
  language: string | null;
  owner: { login: string };
}

export default async function(req: Request): Promise<Response> {
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
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { githubToken, userData } = body;

    if (!githubToken || !userData) {
      return new Response(
        JSON.stringify({ error: 'githubToken and userData are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const githubUser: GitHubUser = userData;

    // Step 1: Check if user already exists
    const checkResponse = await fetch(
      `${baseUrl}/api/database/records/users?select=id&github_id=eq.${githubUser.id}`,
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    
    const existingUsers = await checkResponse.json();
    
    let userId: string;
    
    if (existingUsers && existingUsers.length > 0) {
      // User exists, update profile
      userId = existingUsers[0].id;
      console.log('User exists, updating:', userId);
      
      await fetch(`${baseUrl}/api/database/records/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: githubUser.name || githubUser.login,
          avatar_url: githubUser.avatar_url,
          bio: githubUser.bio,
          location: githubUser.location,
          html_url: githubUser.html_url
        })
      });
    } else {
      // Create new user
      console.log('Creating new user for github_id:', githubUser.id);
      
      const createResponse = await fetch(`${baseUrl}/api/database/records/users`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`, 
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([{
          github_id: githubUser.id.toString(),
          name: githubUser.name || githubUser.login,
          avatar_url: githubUser.avatar_url,
          bio: githubUser.bio,
          location: githubUser.location,
          html_url: githubUser.html_url
        }])
      });
      
      const newUsers = await createResponse.json();
      userId = newUsers[0].id;
    }

    // Step 2: Fetch GitHub repos and extract skills
    console.log('Fetching repos for:', githubUser.login);
    
    const reposResponse = await fetch(
      `https://api.github.com/users/${githubUser.login}/repos?sort=updated&per_page=10`,
      { headers: { 'Authorization': `token ${githubToken}`, 'User-Agent': 'DevMatch' } }
    );
    
    if (!reposResponse.ok) {
      console.error('Failed to fetch repos:', reposResponse.status);
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId, 
          warning: 'User created but failed to fetch repos',
          message: 'You can try refreshing to analyze your repos later'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const repos: GitHubRepo[] = await reposResponse.json();
    
    // Count languages
    const languageCounts: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    }
    
    console.log('Languages found:', languageCounts);

    // Step 3: Delete old skills and insert new ones
    // First delete existing skills
    await fetch(`${baseUrl}/api/database/records/skills?user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    // Insert new skills
    const skillsToInsert = Object.entries(languageCounts).map(([language, count]) => ({
      user_id: userId,
      skill_name: language,
      skill_count: count
    }));
    
    if (skillsToInsert.length > 0) {
      const skillsResponse = await fetch(`${baseUrl}/api/database/records/skills`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`, 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(skillsToInsert)
      });
      
      if (!skillsResponse.ok) {
        console.error('Failed to insert skills:', await skillsResponse.text());
      }
    }

    // Step 4: Trigger personality calculation (the database trigger should handle this)
    // But let's verify by fetching the updated user
    const updatedUserResponse = await fetch(
      `${baseUrl}/api/database/records/users?id=eq.${userId}&select=*`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    
    const updatedUser = await updatedUserResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        skills: skillsToInsert,
        personality: updatedUser[0]?.personality_title || 'Not calculated yet',
        message: 'Profile setup complete! Your skills have been analyzed.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Setup failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
