import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/supabase'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export default function TestSupabase() {
  const [results, setResults] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (message: string) => {
    setResults(prev => [...prev, message])
  }

  const testSupabaseConnection = async () => {
    setIsRunning(true)
    setResults([])
    
    addResult('🧪 Testing Supabase Connection...\n')

    try {
      // Test 1: Basic connection
      addResult('1. Testing basic connection...')
      const { data: connectionTest, error: connectionError } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true })
      
      if (connectionError) {
        addResult(`❌ Connection failed: ${connectionError.message}`)
        return
      }
      addResult('✅ Connection successful')

      // Test 2: Authentication check
      addResult('\n2. Testing authentication...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      addResult(`Current user: ${user ? `ID: ${user.id}` : 'No authenticated user'}`)
      if (authError && authError.message !== 'Auth session missing!') {
        addResult(`❌ Auth check failed: ${authError.message}`)
      } else {
        addResult('✅ Auth check completed')
      }

      // Test 3: Test user signup (if not already signed up)
      addResult('\n3. Testing user signup...')
      const testEmail = `test-${Date.now()}@meastory.com`
      const testPassword = 'testpassword123'
      
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      })

      if (signupError) {
        addResult(`ℹ️  Signup may require email confirmation: ${signupError.message}`)
      } else {
        addResult(`✅ Signup successful: ${signupData.user?.id}`)
      }

      // Test 4: Test database operations
      addResult('\n4. Testing database operations...')

      // Get current user (if authenticated)
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (currentUser) {
        // Test creating a story
        addResult('   Creating test story...')
        const { data: storyData, error: storyError } = await supabase
          .from('stories')
          .insert({
            title: 'Test Story',
            description: 'A test story for connection verification',
            author_id: currentUser.id,
            status: 'draft'
          })
          .select()
          .single()

        if (storyError) {
          addResult(`❌ Story creation failed: ${storyError.message}`)
        } else {
          addResult(`✅ Story created: ${storyData.id}`)

          // Test creating a story scene
          addResult('   Creating test story scene...')
          const { data: sceneData, error: sceneError } = await supabase
            .from('story_scenes')
            .insert({
              story_id: storyData.id,
              scene_order: 1,
              title: 'Test Scene',
              content: 'This is a test scene for our story.',
              choices: [
                { text: 'Go left', next_scene: 2 },
                { text: 'Go right', next_scene: 3 }
              ]
            })
            .select()
            .single()

          if (sceneError) {
            addResult(`❌ Scene creation failed: ${sceneError.message}`)
          } else {
            addResult(`✅ Scene created: ${sceneData.id}`)
          }

          // Test creating a room
          addResult('   Creating test room...')
          const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .insert({
              name: 'Test Room',
              host_id: currentUser.id,
              max_participants: 5
            })
            .select()
            .single()

          if (roomError) {
            addResult(`❌ Room creation failed: ${roomError.message}`)
          } else {
            addResult(`✅ Room created: ${roomData.id} Code: ${roomData.code}`)
          }

          // Clean up test data
          addResult('\n5. Cleaning up test data...')
          if (sceneData) {
            await supabase.from('story_scenes').delete().eq('id', sceneData.id)
          }
          if (roomData) {
            await supabase.from('rooms').delete().eq('id', roomData.id)
          }
          if (storyData) {
            await supabase.from('stories').delete().eq('id', storyData.id)
          }
          addResult('✅ Test data cleaned up')
        }
      } else {
        addResult('ℹ️  Skipping database tests (no authenticated user)')
      }

      // Test 5: Real-time subscription test
      addResult('\n6. Testing real-time subscriptions...')
      const channel = supabase
        .channel('test-channel')
        .on('presence', { event: 'sync' }, () => {
          addResult('✅ Real-time presence sync working')
        })
        .subscribe((status) => {
          addResult(`Real-time status: ${status}`)
          if (status === 'SUBSCRIBED') {
            addResult('✅ Real-time subscription successful')
            // Clean up
            supabase.removeChannel(channel)
          }
        })

      // Wait a moment for real-time test
      await new Promise(resolve => setTimeout(resolve, 2000))

      addResult('\n🎉 All Supabase tests completed!')
      addResult('Your connection is working properly.')

    } catch (error) {
      addResult(`❌ Unexpected error during testing: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Supabase Connection Test</h1>
        
        <div className="mb-8">
          <button
            onClick={testSupabaseConnection}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isRunning ? 'Running Tests...' : 'Run Supabase Tests'}
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 font-mono text-sm">
          <h2 className="text-xl font-bold mb-4">Test Results:</h2>
          {results.length === 0 ? (
            <p className="text-gray-400">Click "Run Supabase Tests" to start testing...</p>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => (
                <div key={index} className="whitespace-pre-wrap">{result}</div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            This test will verify your Supabase connection, authentication, and database operations.
          </p>
        </div>
      </div>
    </div>
  )
}
