'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { insforge } from '@/lib/insforge'

interface Personality {
  type: string
  title: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface Props {
  userId: string
  initialPersonality?: Personality | null
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

function getRarityBorder(rarity: string) {
  switch (rarity) {
    case 'legendary': return 'border-purple-400 shadow-purple-200'
    case 'epic': return 'border-blue-400 shadow-blue-200'
    case 'rare': return 'border-green-400 shadow-green-200'
    default: return 'border-gray-300'
  }
}

export default function PersonalityCard({ userId, initialPersonality }: Props) {
  const [personality, setPersonality] = useState<Personality | null>(initialPersonality || null)
  const [loading, setLoading] = useState(false)

  const refreshPersonality = async () => {
    setLoading(true)
    try {
      // Fetch latest user data with personality
      const { data, error } = await insforge.database
        .from('users')
        .select('personality_type, personality_title, personality_description, personality_rarity')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to fetch personality:', error)
        return
      }

      if (data) {
        setPersonality({
          type: data.personality_type,
          title: data.personality_title,
          description: data.personality_description,
          rarity: data.personality_rarity
        })
      }
    } catch (error) {
      console.error('Error refreshing personality:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!personality) {
    return (
      <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
        <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 font-medium">No Personality Card Yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Analyze your GitHub repos to generate your personality!
        </p>
      </div>
    )
  }

  return (
    <div className={`relative bg-white rounded-xl border-2 ${getRarityBorder(personality.rarity)} shadow-lg overflow-hidden`}>
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${getRarityColor(personality.rarity)} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Developer Archetype</span>
          </div>
          <button
            onClick={refreshPersonality}
            disabled={loading}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Refresh personality"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Rarity badge */}
          <div className={`flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br ${getRarityColor(personality.rarity)} flex items-center justify-center text-3xl shadow-lg`}>
            {getRarityEmoji(personality.rarity)}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 truncate">
              {personality.title}
            </h3>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-gradient-to-r ${getRarityColor(personality.rarity)} text-white`}>
              {personality.rarity}
            </span>
            <p className="mt-3 text-gray-600 text-sm leading-relaxed">
              {personality.description}
            </p>
          </div>
        </div>

        {/* Type indicator */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Type</span>
            <span className="font-medium text-gray-700 capitalize">
              {personality.type.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Shine effect for legendary/epic */}
      {(personality.rarity === 'legendary' || personality.rarity === 'epic') && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      )}
    </div>
  )
}
