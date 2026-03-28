'use client'

import { useState } from 'react'
import { Search, Loader2, MapPin, ExternalLink, Sparkles } from 'lucide-react'
import { insforge } from '@/lib/insforge'

interface MatchResult {
  userId: string
  name: string
  avatar: string
  skills: string[]
  matchScore: number
  sharedSkills: string[]
  complementarySkills: string[]
  location?: string
  bio?: string
  htmlUrl?: string
  personality?: {
    type: string
    title: string
    description: string
    rarity: string
  }
}

interface MatchResponse {
  success: boolean
  user: {
    login: string
    name: string
    avatar: string
    bio: string | null
    location: string | null
    htmlUrl: string
    publicRepos: number
  }
  skills: { name: string; count: number }[]
  personality: {
    type: string
    title: string
    description: string
    rarity: string
    breakdown: Record<string, number>
  }
  matches: MatchResult[]
}

function getRarityColor(rarity: string) {
  switch (rarity) {
    case 'legendary': return 'from-purple-500 to-pink-500'
    case 'epic': return 'from-blue-500 to-purple-500'
    case 'rare': return 'from-green-400 to-blue-500'
    default: return 'from-gray-400 to-gray-500'
  }
}

function getRarityEmoji(rarity: string) {
  switch (rarity) {
    case 'legendary': return '👑'
    case 'epic': return '⚡'
    case 'rare': return '💎'
    default: return '📄'
  }
}

export default function GitHubMatcher() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MatchResponse | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data, error: funcError } = await insforge.functions.invoke('match-github-user', {
        body: { githubUsername: username.trim() }
      })

      if (funcError) {
        setError(funcError.message || 'Failed to match user')
        return
      }

      if (data.error) {
        setError(data.error)
        return
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <h2 className="text-xl font-bold">Try Without Login</h2>
        </div>
        <p className="text-gray-300 text-sm">
          Enter any GitHub username to see their personality card and matches
        </p>
      </div>

      {/* Search Form */}
      <div className="p-6 border-b border-gray-100">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">github.com/</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full pl-24 pr-4 py-3 border border-blue-300 bg-white text-blue-600 placeholder-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Find Matches
              </>
            )}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="p-6 space-y-6">
          {/* User Profile & Personality */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Card */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center gap-4">
                <img
                  src={result.user.avatar}
                  alt={result.user.name}
                  className="w-16 h-16 rounded-full border-2 border-white shadow"
                />
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{result.user.name}</h3>
                  <a
                    href={result.user.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    @{result.user.login}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              {result.user.bio && (
                <p className="mt-3 text-sm text-gray-600">{result.user.bio}</p>
              )}
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                {result.user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {result.user.location}
                  </span>
                )}
                <span>{result.user.publicRepos} public repos</span>
              </div>
              {/* Skills */}
              <div className="mt-4 flex flex-wrap gap-2">
                {result.skills.slice(0, 8).map((skill) => (
                  <span
                    key={skill.name}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                  >
                    {skill.name} ({skill.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Personality Card */}
            <div className={`rounded-xl border-2 overflow-hidden ${
              result.personality.rarity === 'legendary' ? 'border-purple-400' :
              result.personality.rarity === 'epic' ? 'border-blue-400' :
              result.personality.rarity === 'rare' ? 'border-green-400' :
              'border-gray-300'
            }`}>
              <div className={`bg-gradient-to-r ${getRarityColor(result.personality.rarity)} p-4 text-white`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-medium opacity-90">Developer Archetype</span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getRarityColor(result.personality.rarity)} flex items-center justify-center text-2xl shadow-lg`}>
                    {getRarityEmoji(result.personality.rarity)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{result.personality.title}</h4>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-gradient-to-r ${getRarityColor(result.personality.rarity)} text-white`}>
                      {result.personality.rarity}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">{result.personality.description}</p>
              </div>
            </div>
          </div>

          {/* Matches */}
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-4">
              Top Matches ({result.matches.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.matches.map((match) => (
                <div
                  key={match.userId}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={match.avatar}
                      alt={match.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 truncate">{match.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          match.matchScore >= 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {match.matchScore}% match
                        </span>
                      </div>
                      {match.personality && (
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <span>{getRarityEmoji(match.personality.rarity)}</span>
                          {match.personality.title}
                        </span>
                      )}
                      {match.sharedSkills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {match.sharedSkills.slice(0, 3).map((skill) => (
                            <span key={skill} className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
