import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/supabase'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...\n')

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true })
    
    if (connectionError) {
      console.error('❌ Connection failed:', connectionError.message)
      return
    }
    console.log('✅ Connection successful')

    // Test 2: Authentication check
    console.log('\n2. Testing authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Current user:', user ? `ID: ${user.id}` : 'No authenticated user')
    if (authError && authError.message !== 'Auth session missing!') {
      console.error('❌ Auth check failed:', authError.message)
    } else {
      console.log('✅ Auth check completed')
    }

    // Test 3: Test user signup (if not already signed up)
    console.log('\n3. Testing user signup...')
    const testEmail = `test-${Date.now()}@meastory.com`
    const testPassword = 'testpassword123'
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })

    if (signupError) {
      console.log('ℹ️  Signup may require email confirmation:', signupError.message)
    } else {
      console.log('✅ Signup successful:', signupData.user?.id)
    }

    // Test 4: Test database operations
    console.log('\n4. Testing database operations...')

    // Get current user (if authenticated)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (currentUser) {
      // Test creating a story
      console.log('   Creating test story...')
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
        console.error('❌ Story creation failed:', storyError.message)
      } else {
        console.log('✅ Story created:', storyData.id)

        // Test creating a story scene
        console.log('   Creating test story scene...')
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
          console.error('❌ Scene creation failed:', sceneError.message)
        } else {
          console.log('✅ Scene created:', sceneData.id)
        }

        // Test creating a room
        console.log('   Creating test room...')
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
          console.error('❌ Room creation failed:', roomError.message)
        } else {
          console.log('✅ Room created:', roomData.id, 'Code:', roomData.code)
        }

        // Clean up test data
        console.log('\n5. Cleaning up test data...')
        if (sceneData) {
          await supabase.from('story_scenes').delete().eq('id', sceneData.id)
        }
        if (roomData) {
          await supabase.from('rooms').delete().eq('id', roomData.id)
        }
        if (storyData) {
          await supabase.from('stories').delete().eq('id', storyData.id)
        }
        console.log('✅ Test data cleaned up')
      }
    } else {
      console.log('ℹ️  Skipping database tests (no authenticated user)')
    }

    // Test 5: Real-time subscription test
    console.log('\n6. Testing real-time subscriptions...')
    const channel = supabase
      .channel('test-channel')
      .on('presence', { event: 'sync' }, () => {
        console.log('✅ Real-time presence sync working')
      })
      .subscribe((status) => {
        console.log('Real-time status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription successful')
          // Clean up
          supabase.removeChannel(channel)
        }
      })

    // Wait a moment for real-time test
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('\n🎉 All Supabase tests completed!')
    console.log('Your connection is working properly.')

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error)
  }
}

// Export for use in browser console or as a module
if (typeof window !== 'undefined') {
  // Browser environment
  window.testSupabase = testSupabaseConnection
} else {
  // Node.js environment - run the test
  testSupabaseConnection()
}
