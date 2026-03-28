// Events API
// Create events from Luma/Meetup links, join via code, list participants, CSV import

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I/L)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface EventRow {
  id: string;
  event_url: string | null;
  event_name: string;
  event_date: string | null;
  event_description: string | null;
  platform: string;
  host_user_id: string | null;
  join_code: string;
  created_at: string;
}

interface EventWithHost extends EventRow {
  host_name?: string;
  host_avatar?: string;
  participant_count?: number;
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

  const baseUrl = Deno.env.get('INSFORGE_INTERNAL_URL') || 'http://localhost:8080';
  const apiKey = Deno.env.get('API_KEY') || '';
  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // GET requests may not have body
    }

    const action = body.action || 'list';

    // ============ LIST EVENTS ============
    if (action === 'list') {
      const response = await fetch(
        `${baseUrl}/api/database/records/events?select=*&order=created_at.desc&limit=50`,
        { headers }
      );
      let events: EventWithHost[] = await response.json();

      // Get host info
      const hostIds = [...new Set(events.filter(e => e.host_user_id).map(e => e.host_user_id))];
      if (hostIds.length > 0) {
        const usersResponse = await fetch(
          `${baseUrl}/api/database/records/users?select=id,name,avatar_url&id=in.(${hostIds.join(',')})`,
          { headers }
        );
        const users = await usersResponse.json();
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        events = events.map(e => ({
          ...e,
          host_name: e.host_user_id ? userMap.get(e.host_user_id)?.name || 'Unknown' : undefined,
          host_avatar: e.host_user_id ? userMap.get(e.host_user_id)?.avatar_url || '' : undefined,
        }));
      }

      // Get participant counts
      const eventIds = events.map(e => e.id);
      if (eventIds.length > 0) {
        const participantsResponse = await fetch(
          `${baseUrl}/api/database/records/event_participants?select=event_id&event_id=in.(${eventIds.join(',')})`,
          { headers }
        );
        const participants = await participantsResponse.json();
        const countMap: Record<string, number> = {};
        for (const p of participants) {
          countMap[p.event_id] = (countMap[p.event_id] || 0) + 1;
        }
        events = events.map(e => ({ ...e, participant_count: countMap[e.id] || 0 }));
      }

      return new Response(
        JSON.stringify({ success: true, events }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ GET EVENT BY ID ============
    if (action === 'get') {
      const { eventId } = body;
      if (!eventId) {
        return new Response(JSON.stringify({ error: 'eventId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const eventResponse = await fetch(
        `${baseUrl}/api/database/records/events?id=eq.${eventId}`,
        { headers }
      );
      const events = await eventResponse.json();
      if (!events.length) {
        return new Response(JSON.stringify({ error: 'Event not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const event = events[0];

      // Get host info
      let host = null;
      if (event.host_user_id) {
        const hostResponse = await fetch(
          `${baseUrl}/api/database/records/users?select=id,name,avatar_url,bio,html_url&id=eq.${event.host_user_id}`,
          { headers }
        );
        const hosts = await hostResponse.json();
        host = hosts[0] || null;
      }

      // Get participants with user info
      const participantsResponse = await fetch(
        `${baseUrl}/api/database/records/event_participants?event_id=eq.${eventId}&select=*`,
        { headers }
      );
      const participantRows = await participantsResponse.json();

      let participants: any[] = [];
      if (participantRows.length > 0) {
        const userIds = participantRows.map((p: any) => p.user_id);
        const usersResponse = await fetch(
          `${baseUrl}/api/database/records/users?select=id,name,avatar_url,bio,location,html_url&id=in.(${userIds.join(',')})`,
          { headers }
        );
        const users = await usersResponse.json();
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        participants = participantRows.map((p: any) => ({
          ...p,
          user: userMap.get(p.user_id) || null,
        }));
      }

      return new Response(
        JSON.stringify({ success: true, event: { ...event, host }, participants }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ LOOKUP BY JOIN CODE ============
    if (action === 'lookup') {
      const { joinCode } = body;
      if (!joinCode) {
        return new Response(JSON.stringify({ error: 'joinCode required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const eventResponse = await fetch(
        `${baseUrl}/api/database/records/events?join_code=eq.${joinCode.toUpperCase()}&limit=1`,
        { headers }
      );
      const events = await eventResponse.json();
      if (!events.length) {
        return new Response(JSON.stringify({ error: 'No event found with that code' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(
        JSON.stringify({ success: true, event: events[0] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ CREATE EVENT ============
    if (action === 'create') {
      const { eventName, eventUrl, eventDate, eventDescription, platform, hostUserId } = body;

      if (!eventName) {
        return new Response(JSON.stringify({ error: 'eventName is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Generate unique join code (retry if collision)
      let joinCode = generateJoinCode();
      let attempts = 0;
      while (attempts < 5) {
        const checkResponse = await fetch(
          `${baseUrl}/api/database/records/events?join_code=eq.${joinCode}&limit=1`,
          { headers }
        );
        const existing = await checkResponse.json();
        if (existing.length === 0) break;
        joinCode = generateJoinCode();
        attempts++;
      }

      const createResponse = await fetch(`${baseUrl}/api/database/records/events`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify([{
          event_name: eventName,
          event_url: eventUrl || null,
          event_date: eventDate || null,
          event_description: eventDescription || null,
          platform: platform || 'other',
          host_user_id: hostUserId || null,
          join_code: joinCode,
        }])
      });

      if (!createResponse.ok) {
        const errText = await createResponse.text();
        return new Response(JSON.stringify({ error: 'Failed to create event', details: errText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const newEvent = await createResponse.json();

      // Auto-join the host as first participant
      if (hostUserId) {
        await fetch(`${baseUrl}/api/database/records/event_participants`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{ event_id: newEvent[0].id, user_id: hostUserId }])
        });
      }

      return new Response(
        JSON.stringify({ success: true, event: newEvent[0] }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ JOIN EVENT ============
    if (action === 'join') {
      const { eventId, userId } = body;

      if (!eventId || !userId) {
        return new Response(JSON.stringify({ error: 'eventId and userId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check event exists
      const eventResponse = await fetch(
        `${baseUrl}/api/database/records/events?id=eq.${eventId}&limit=1`,
        { headers }
      );
      const events = await eventResponse.json();
      if (!events.length) {
        return new Response(JSON.stringify({ error: 'Event not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check if already joined
      const existingResponse = await fetch(
        `${baseUrl}/api/database/records/event_participants?event_id=eq.${eventId}&user_id=eq.${userId}`,
        { headers }
      );
      const existing = await existingResponse.json();
      if (existing.length > 0) {
        return new Response(
          JSON.stringify({ success: true, alreadyJoined: true, message: 'Already a participant' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Join
      const joinResponse = await fetch(`${baseUrl}/api/database/records/event_participants`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify([{ event_id: eventId, user_id: userId }])
      });

      if (!joinResponse.ok) {
        const errText = await joinResponse.text();
        return new Response(JSON.stringify({ error: 'Failed to join event', details: errText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const participant = await joinResponse.json();
      return new Response(
        JSON.stringify({ success: true, participant: participant[0] }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ IMPORT ATTENDEES (CSV-style) ============
    if (action === 'import') {
      const { eventId, githubUsernames } = body;

      if (!eventId || !githubUsernames || !Array.isArray(githubUsernames)) {
        return new Response(JSON.stringify({ error: 'eventId and githubUsernames[] required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Look up users by github login (html_url contains github.com/username)
      // We'll match against the name or github_id fields
      const matched: string[] = [];
      const notFound: string[] = [];

      for (const username of githubUsernames) {
        // Try matching by html_url (contains github.com/username)
        const userResponse = await fetch(
          `${baseUrl}/api/database/records/users?html_url=ilike.*/${encodeURIComponent(username)}&limit=1`,
          { headers }
        );
        const users = await userResponse.json();

        if (users.length > 0) {
          const userId = users[0].id;

          // Check if already participant
          const existingResponse = await fetch(
            `${baseUrl}/api/database/records/event_participants?event_id=eq.${eventId}&user_id=eq.${userId}`,
            { headers }
          );
          const existing = await existingResponse.json();

          if (existing.length === 0) {
            await fetch(`${baseUrl}/api/database/records/event_participants`, {
              method: 'POST',
              headers,
              body: JSON.stringify([{ event_id: eventId, user_id: userId }])
            });
          }
          matched.push(username);
        } else {
          notFound.push(username);
        }
      }

      return new Response(
        JSON.stringify({ success: true, matched, notFound, matchedCount: matched.length, notFoundCount: notFound.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: list, get, lookup, create, join, import' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Events API error:', error);
    return new Response(
      JSON.stringify({ error: 'Request failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
