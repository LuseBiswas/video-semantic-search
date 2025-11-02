import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DashboardLayout } from '../components/DashboardLayout'
import { supabase } from '../lib/supabase'
import { User, Mail, Save, X, Upload, Loader, CheckCircle, AlertCircle } from 'lucide-react'

export function Profile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Form state
  const [profile, setProfile] = useState({
    email: '',
    full_name: '',
    avatar_url: ''
  })
  
  const [originalProfile, setOriginalProfile] = useState({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchProfile()
    }
  }, [user?.id])

  useEffect(() => {
    // Check if there are changes
    const changed = 
      profile.full_name !== originalProfile.full_name ||
      profile.avatar_url !== originalProfile.avatar_url
    setHasChanges(changed)
  }, [profile, originalProfile])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      const profileData = {
        email: data.email || user.email,
        full_name: data.full_name || '',
        avatar_url: data.avatar_url || ''
      }
      
      setProfile(profileData)
      setOriginalProfile(profileData)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setOriginalProfile(profile)
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' })
      }, 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setProfile(originalProfile)
    setMessage({ type: '', text: '' })
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setProfile({ ...profile, avatar_url: publicUrl })
      setMessage({ type: 'success', text: 'Avatar uploaded! Click Save to keep changes.' })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setMessage({ type: 'error', text: 'Failed to upload avatar' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader size={32} className="animate-spin text-custom-blue" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h2>
          <p className="text-gray-600">Manage your account information</p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle size={20} className="text-green-600" />
            ) : (
              <AlertCircle size={20} className="text-red-600" />
            )}
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Avatar Section */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-custom-blue/5 to-custom-blue/10">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-custom-blue flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} />
                  )}
                </div>
                
                {/* Upload Button */}
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-custom-blue hover:bg-custom-blue-hover rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg">
                  <Upload size={16} className="text-white" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {profile.full_name || 'Anonymous'}
                </h3>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Mail size={14} />
                  {profile.email}
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-6 space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-custom-blue transition-colors"
                />
              </div>
            </div>

            {/* Avatar URL (Optional manual entry) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avatar URL <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                type="url"
                value={profile.avatar_url}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-custom-blue transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500">
                Or upload an image using the button above
              </p>
            </div>
          </div>

          {/* Actions */}
          {hasChanges && (
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <X size={18} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                style={{ backgroundColor: '#83c5be' }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#6fb3aa')}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#83c5be')}
              >
                {saving ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

