'use client'

import { useState } from 'react'
import { insforge } from '@/lib/insforge'

export default function SetupProfileButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const setupProfile = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Get current auth user
      const { data: authData } = await insforge.auth.getCurrentUser()
      if (!authData?.user) {
        setResult('Not logged in')
        return
      }

      // For demo: manually enter your GitHub token
      // In production, Dev 1 should get this from the OAuth flow
      const githubToken = prompt('Enter your GitHub personal access token (for testing):')
      if (!githubToken) {
        setResult('GitHub token required')
        return
      }

      // Fetch GitHub user data
      const githubResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'User-Agent': 'DevMatch'
        }
      })

      if (!githubResponse.ok) {
        setResult('Failed to fetch GitHub profile')
        return
      }

      const githubUser = await githubResponse.json()
      console.log('GitHub user:', githubUser)

      // Call setup function
      const { data, error } = await insforge.functions.invoke('setup-user', {
        body: {
          githubToken,
          userData: githubUser
        }
      })

      if (error) {
        console.error('Setup error:', error)
        setResult(`Error: ${error.message}`)
        return
      }

      console.log('Setup result:', data)
      setResult(`Success! ${data.message} Skills: ${data.skills?.map((s: any) => s.skill_name).join(', ') || 'None'}. Personality: ${data.personality}`)
      
      // Reload page to show updated data
      setTimeout(() => window.location.reload(), 2000)

    } catch (error: any) {
      console.error('Setup failed:', error)
      setResult(`Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-blue-900 mb-2">Setup Your Profile</h3>
      <p className="text-sm text-blue-700 mb-3">
        Analyze your GitHub repos to generate skills and personality card.
      </p>
      <div className="text-xs text-blue-600 mb-3 bg-blue-100 p-2 rounded">
        <strong>Need a token?</strong> Go to{' '}
        <a 
          href="https://github.com/settings/tokens" 
          target="_blank" 
          rel="noopener noreferrer"
          className="underline hover:text-blue-800"
        >
          GitHub Settings → Developer settings → Personal access tokens
        </a>
        . Create a token with <code>read:user</code> and <code>public_repo</code> scopes.
      </div>
      <button
        onClick={setupProfile}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Setting up...' : 'Analyze My GitHub'}
      </button>
      {result && (
        <p className={`mt-3 text-sm ${result.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
          {result}
        </p>
      )}
    </div>
  )
}
