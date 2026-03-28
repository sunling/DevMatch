// Project Board API
// Create, list, apply to projects for developer collaboration

interface Project {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  skills_needed: string[];
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  collaborators_max: number;
  collaborators_current: number;
  created_at: string;
}

interface ProjectWithOwner extends Project {
  owner_name?: string;
  owner_avatar?: string;
  match_score?: number;
}

export default async function(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const baseUrl = Deno.env.get('INSFORGE_INTERNAL_URL') || 'http://localhost:8080';
  const apiKey = Deno.env.get('API_KEY') || '';

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    // ============ LIST PROJECTS ============
    if (req.method === 'GET' && action === 'list') {
      const status = url.searchParams.get('status') || 'open';
      const skill = url.searchParams.get('skill');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      
      let query = `${baseUrl}/api/database/records/projects?select=*&status=eq.${status}&order=created_at.desc&limit=${limit}`;
      
      const response = await fetch(query, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      let projects: ProjectWithOwner[] = await response.json();
      
      // Get owner info for each project
      const ownerIds = [...new Set(projects.map(p => p.owner_id))];
      if (ownerIds.length > 0) {
        const usersResponse = await fetch(
          `${baseUrl}/api/database/records/users?select=id,name,avatar_url&id=in.(${ownerIds.join(',')})`,
          { headers: { 'Authorization': `Bearer ${apiKey}` } }
        );
        const users = await usersResponse.json();
        
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        projects = projects.map(p => ({
          ...p,
          owner_name: userMap.get(p.owner_id)?.name || 'Unknown',
          owner_avatar: userMap.get(p.owner_id)?.avatar_url || ''
        }));
      }

      // Filter by skill if provided
      if (skill) {
        projects = projects.filter(p => 
          p.skills_needed.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        );
      }

      return new Response(
        JSON.stringify({ success: true, projects }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ GET SINGLE PROJECT ============
    if (req.method === 'GET' && action === 'get') {
      const projectId = url.searchParams.get('id');
      if (!projectId) {
        return new Response(JSON.stringify({ error: 'Project ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const projectResponse = await fetch(
        `${baseUrl}/api/database/records/projects?id=eq.${projectId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const projects = await projectResponse.json();
      
      if (!projects.length) {
        return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const project = projects[0];

      // Get owner info
      const userResponse = await fetch(
        `${baseUrl}/api/database/records/users?select=id,name,avatar_url,bio,location,html_url&id=eq.${project.owner_id}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const users = await userResponse.json();
      const owner = users[0];

      // Get applications
      const appsResponse = await fetch(
        `${baseUrl}/api/database/records/project_applications?project_id=eq.${projectId}&select=*`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const applications = await appsResponse.json();

      return new Response(
        JSON.stringify({ success: true, project: { ...project, owner }, applications }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ CREATE PROJECT ============
    if (req.method === 'POST' && action === 'create') {
      const body = await req.json();
      const { title, description, ownerId, skillsNeeded, collaboratorsMax } = body;

      if (!title || !description || !ownerId) {
        return new Response(JSON.stringify({ error: 'Title, description, and ownerId are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const createResponse = await fetch(`${baseUrl}/api/database/records/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([{
          title,
          description,
          owner_id: ownerId,
          skills_needed: skillsNeeded || [],
          collaborators_max: collaboratorsMax || 3
        }])
      });

      const newProject = await createResponse.json();
      
      return new Response(
        JSON.stringify({ success: true, project: newProject[0] }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ APPLY TO PROJECT ============
    if (req.method === 'POST' && action === 'apply') {
      const body = await req.json();
      const { projectId, userId, message } = body;

      if (!projectId || !userId) {
        return new Response(JSON.stringify({ error: 'Project ID and User ID are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check if already applied
      const existingResponse = await fetch(
        `${baseUrl}/api/database/records/project_applications?project_id=eq.${projectId}&user_id=eq.${userId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const existing = await existingResponse.json();
      
      if (existing.length > 0) {
        return new Response(JSON.stringify({ error: 'Already applied to this project' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Create application
      const applyResponse = await fetch(`${baseUrl}/api/database/records/project_applications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([{
          project_id: projectId,
          user_id: userId,
          message: message || ''
        }])
      });

      const application = await applyResponse.json();
      
      return new Response(
        JSON.stringify({ success: true, application: application[0] }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ ACCEPT/REJECT APPLICATION ============
    if (req.method === 'PATCH' && action === 'application') {
      const body = await req.json();
      const { applicationId, status } = body;

      if (!applicationId || !status) {
        return new Response(JSON.stringify({ error: 'Application ID and status are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Update application status
      await fetch(`${baseUrl}/api/database/records/project_applications?id=eq.${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      // If accepted, increment collaborators count
      if (status === 'accepted') {
        const appResponse = await fetch(
          `${baseUrl}/api/database/records/project_applications?id=eq.${applicationId}`,
          { headers: { 'Authorization': `Bearer ${apiKey}` } }
        );
        const apps = await appResponse.json();
        
        if (apps.length > 0) {
          const projectId = apps[0].project_id;
          
          // Get current count
          const projectResponse = await fetch(
            `${baseUrl}/api/database/records/projects?id=eq.${projectId}&select=collaborators_current`,
            { headers: { 'Authorization': `Bearer ${apiKey}` } }
          );
          const projects = await projectResponse.json();
          const currentCount = projects[0]?.collaborators_current || 0;
          
          // Increment
          await fetch(`${baseUrl}/api/database/records/projects?id=eq.${projectId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ collaborators_current: currentCount + 1 })
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ GET MY PROJECTS ============
    if (req.method === 'GET' && action === 'my') {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get owned projects
      const ownedResponse = await fetch(
        `${baseUrl}/api/database/records/projects?owner_id=eq.${userId}&select=*&order=created_at.desc`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const owned = await ownedResponse.json();

      // Get applied projects
      const appsResponse = await fetch(
        `${baseUrl}/api/database/records/project_applications?user_id=eq.${userId}&select=*`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      const applications = await appsResponse.json();

      // Get project details for applications
      const appliedProjectIds = applications.map((a: any) => a.project_id);
      let applied: any[] = [];
      if (appliedProjectIds.length > 0) {
        const projectsResponse = await fetch(
          `${baseUrl}/api/database/records/projects?id=in.(${appliedProjectIds.join(',')})`,
          { headers: { 'Authorization': `Bearer ${apiKey}` } }
        );
        applied = await projectsResponse.json();
        
        // Merge with application status
        applied = applied.map(p => {
          const app = applications.find((a: any) => a.project_id === p.id);
          return { ...p, application_status: app?.status };
        });
      }

      return new Response(
        JSON.stringify({ success: true, owned, applied }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Project API error:', error);
    return new Response(
      JSON.stringify({ error: 'Request failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
