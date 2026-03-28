'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Clock, ChevronRight, X, Send, Check, XCircle, Loader2, UserPlus, Sparkles } from 'lucide-react'
import { insforge } from '@/lib/insforge'

interface Project {
  id: string
  title: string
  description: string
  owner_id: string
  skills_needed: string[]
  status: 'open' | 'in_progress' | 'completed' | 'closed'
  collaborators_max: number
  collaborators_current: number
  created_at: string
  owner_name?: string
  owner_avatar?: string
}

const SKILL_OPTIONS = [
  'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'C#',
  'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Django', 'Flask',
  'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'Machine Learning', 'AI', 'Data Science',
  'React Native', 'Flutter', 'Swift', 'Kotlin',
  'Unity', 'Unreal Engine', 'Game Development',
  'UI/UX Design', 'Figma', 'CSS', 'Tailwind'
]

export default function ProjectBoard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showApply, setShowApply] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [matchedDevelopers, setMatchedDevelopers] = useState<any[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [collaboratorsMax, setCollaboratorsMax] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [applyMessage, setApplyMessage] = useState('')

  useEffect(() => {
    loadProjects()
    // Get current user ID
    insforge.auth.getCurrentUser().then(({ data }) => {
      if (data?.user) {
        // Try to find user in our database
        setUserId(data.user.id)
      }
    })
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const { data, error } = await insforge.functions.invoke('projects', {
        method: 'GET',
        body: { action: 'list' }
      })
      
      if (!error && data?.success) {
        setProjects(data.projects)
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMatchedDevelopers = async (skills: string[], excludeOwnerId: string) => {
    setLoadingMatches(true)
    try {
      const { data, error } = await insforge.functions.invoke('project-matches', {
        method: 'POST',
        body: { skills, excludeOwner: excludeOwnerId }
      })
      
      if (!error && data?.success) {
        setMatchedDevelopers(data.matches || [])
      }
    } catch (err) {
      console.error('Failed to load matches:', err)
    } finally {
      setLoadingMatches(false)
    }
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    setMatchedDevelopers([])
    // Load matched developers for this project
    if (project.skills_needed.length > 0) {
      loadMatchedDevelopers(project.skills_needed, project.owner_id)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description || !userId) return

    setSubmitting(true)
    try {
      const { data, error } = await insforge.functions.invoke('projects', {
        method: 'POST',
        body: {
          action: 'create',
          title,
          description,
          ownerId: userId,
          skillsNeeded: selectedSkills,
          collaboratorsMax
        }
      })

      if (!error && data?.success) {
        setShowCreate(false)
        setTitle('')
        setDescription('')
        setSelectedSkills([])
        setCollaboratorsMax(3)
        loadProjects()
      }
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApply = async () => {
    if (!selectedProject || !userId) return

    setSubmitting(true)
    try {
      const { data, error } = await insforge.functions.invoke('projects', {
        method: 'POST',
        body: {
          action: 'apply',
          projectId: selectedProject.id,
          userId,
          message: applyMessage
        }
      })

      if (!error && data?.success) {
        setShowApply(false)
        setSelectedProject(null)
        setApplyMessage('')
        alert('Application submitted!')
      } else if (error?.message?.includes('Already applied')) {
        alert('You have already applied to this project!')
      }
    } catch (err) {
      console.error('Failed to apply:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Board</h2>
          <p className="text-gray-600 mt-1">Find collaborators for your next project</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post Project
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No projects yet. Be the first to post one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSelectProject(project)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg text-gray-900">{project.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  project.status === 'open' ? 'bg-green-100 text-green-700' :
                  project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>

              <p className="text-gray-600 text-sm line-clamp-2 mb-4">{project.description}</p>

              <div className="flex flex-wrap gap-1 mb-4">
                {project.skills_needed.slice(0, 4).map((skill) => (
                  <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {skill}
                  </span>
                ))}
                {project.skills_needed.length > 4 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                    +{project.skills_needed.length - 4} more
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  {project.owner_avatar && (
                    <img src={project.owner_avatar} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span>{project.owner_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {project.collaborators_current}/{project.collaborators_max}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(project.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Post a Project</h3>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., AI Chat Application"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project, what you're building, and what help you need..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills Needed</label>
                <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                  {SKILL_OPTIONS.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        selectedSkills.includes(skill)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Collaborators</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={collaboratorsMax}
                  onChange={(e) => setCollaboratorsMax(parseInt(e.target.value))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !title || !description}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && !showApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{selectedProject.title}</h3>
                <button onClick={() => setSelectedProject(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-700">{selectedProject.description}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Skills Needed</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedProject.skills_needed.map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {selectedProject.owner_avatar && (
                    <img src={selectedProject.owner_avatar} alt="" className="w-8 h-8 rounded-full" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{selectedProject.owner_name}</p>
                    <p className="text-xs text-gray-500">Project Owner</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedProject.collaborators_current}/{selectedProject.collaborators_max}
                  </p>
                  <p className="text-xs text-gray-500">Collaborators</p>
                </div>
              </div>
              {/* Matched Developers Section */}
              {selectedProject.skills_needed.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Recommended Collaborators
                    </h4>
                    <span className="text-xs text-gray-500">
                      {matchedDevelopers.length} match{matchedDevelopers.length !== 1 ? 'es' : ''} found
                    </span>
                  </div>
                  
                  {loadingMatches ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  ) : matchedDevelopers.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {matchedDevelopers.slice(0, 5).map((dev) => (
                        <div
                          key={dev.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={dev.avatar_url || '/default-avatar.png'}
                              alt={dev.name}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{dev.name}</p>
                              <p className="text-xs text-gray-500">
                                {dev.matchingSkills?.slice(0, 2).join(', ')}
                                {dev.matchingSkills?.length > 2 && ` +${dev.matchingSkills.length - 2}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              dev.matchScore >= 60 ? 'bg-green-100 text-green-700' :
                              dev.matchScore >= 30 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {dev.matchScore}% match
                            </span>
                            {dev.personality_title && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <span>{
                                  dev.personality_rarity === 'legendary' ? '👑' :
                                  dev.personality_rarity === 'epic' ? '⚡' :
                                  dev.personality_rarity === 'rare' ? '💎' : '📄'
                                }</span>
                                <span className="truncate max-w-[80px]">{dev.personality_title}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-3">
                      No developers with matching skills found yet.
                    </p>
                  )}
                </div>
              )}

              {selectedProject.status === 'open' && selectedProject.collaborators_current < selectedProject.collaborators_max && (
                <button
                  onClick={() => setShowApply(true)}
                  className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Apply to Join
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApply && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Apply to {selectedProject.title}</h3>
                <button onClick={() => setShowApply(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Why do you want to join? (optional)
                </label>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Tell the project owner about yourself and why you'd be a good fit..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApply(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={submitting}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
