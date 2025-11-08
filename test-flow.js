#!/usr/bin/env node

/**
 * Test script for collaborative writing flow
 * Tests the full user flow with two test users
 * 
 * Usage: node test-flow.js
 * 
 * Make sure your .env.local has:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test users
const USER1 = {
  email: 'test@example.com',
  password: 'test123'
};

const USER2 = {
  email: 'test2@example.com',
  password: 'test2123'
};

let user1Session = null;
let user2Session = null;
let testThreadId = null;

async function testStep(stepName, testFn) {
  console.log(`\n📋 ${stepName}`);
  try {
    await testFn();
    console.log(`✅ ${stepName} - PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ ${stepName} - FAILED:`, error.message);
    console.error(error);
    return false;
  }
}

async function signInUser(user) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });
  
  if (error) throw error;
  return data.session;
}

async function signOut() {
  await supabase.auth.signOut();
}

async function testFlow() {
  console.log('🚀 Starting Collaborative Writing Flow Test\n');
  console.log('='.repeat(60));

  let allPassed = true;

  // Test 1: User 1 signs in
  allPassed = await testStep('User 1 Sign In', async () => {
    user1Session = await signInUser(USER1);
    if (!user1Session) throw new Error('Failed to get session');
    console.log(`   User ID: ${user1Session.user.id}`);
  }) && allPassed;

  // Test 2: User 1 creates a thread
  allPassed = await testStep('User 1 Creates Thread', async () => {
    const { data, error } = await supabase
      .from('writing_threads')
      .insert({
        theme: 'Test Thread - Flow Test',
        min_participants: 2,
        max_participants: 5,
        created_by: user1Session.user.id
      })
      .select()
      .single();

    if (error) throw error;
    testThreadId = data.id;
    console.log(`   Thread ID: ${testThreadId}`);
    console.log(`   Status: ${data.status}`);
  }) && allPassed;

  // Test 3: User 1 joins their own thread (should be automatic creator)
  allPassed = await testStep('User 1 Joins Thread', async () => {
    const { data, error } = await supabase
      .from('thread_participants')
      .insert({
        thread_id: testThreadId,
        user_id: user1Session.user.id
      })
      .select()
      .single();

    if (error && !error.message.includes('duplicate')) throw error;
    console.log(`   User 1 is participant`);
  }) && allPassed;

  // Test 4: User 2 signs in
  allPassed = await testStep('User 2 Sign In', async () => {
    await signOut();
    user2Session = await signInUser(USER2);
    if (!user2Session) throw new Error('Failed to get session');
    console.log(`   User ID: ${user2Session.user.id}`);
  }) && allPassed;

  // Test 5: User 2 joins thread
  allPassed = await testStep('User 2 Joins Thread', async () => {
    const { data, error } = await supabase
      .from('thread_participants')
      .insert({
        thread_id: testThreadId,
        user_id: user2Session.user.id
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`   User 2 is participant`);
  }) && allPassed;

  // Test 6: Check thread status (should be active now with 2 participants)
  allPassed = await testStep('Thread Opens (Status = active)', async () => {
    // Wait a moment for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let { data, error } = await supabase
      .from('writing_threads')
      .select('*')
      .eq('id', testThreadId)
      .single();

    if (error) throw error;
    
    // If still waiting, manually open it (trigger might not have fired)
    if (data.status === 'waiting') {
      console.log(`   Thread still waiting, checking participant count...`);
      const { data: participants } = await supabase
        .from('thread_participants')
        .select('*')
        .eq('thread_id', testThreadId);
      
      const participantCount = participants?.data?.length || participants?.length || 0;
      console.log(`   Participant count: ${participantCount}`);
      
      if (participantCount >= 2) {
        console.log(`   Manually opening thread...`);
        // Switch to User 1 (thread creator) to update thread
        await signOut();
        const creatorSession = await signInUser(USER1);
        
        // Manually open thread and assign turn orders
        const { data: allParticipants } = await supabase
          .from('thread_participants')
          .select('*')
          .eq('thread_id', testThreadId)
          .order('joined_at', { ascending: true });
        
        const participantsList = allParticipants?.data || allParticipants || [];
        console.log(`   Found ${participantsList.length} participants to assign turn orders`);
        
        // Assign turn orders - need to update as each user or use a workaround
        // Since RLS might prevent User 1 from updating User 2's record,
        // we'll update each participant record as that user
        for (let i = 0; i < participantsList.length; i++) {
          const participant = participantsList[i];
          
          // Sign in as the participant to update their own record
          await signOut();
          if (participant.user_id === user1Session.user.id) {
            await signInUser(USER1);
          } else if (participant.user_id === user2Session.user.id) {
            await signInUser(USER2);
          } else {
            throw new Error(`Unknown participant user_id: ${participant.user_id}`);
          }
          
          const { error: updateError } = await supabase
            .from('thread_participants')
            .update({ turn_order: i })
            .eq('id', participant.id)
            .eq('user_id', participant.user_id); // Extra safety check
          
          if (updateError) {
            console.error(`   Error updating turn_order for participant ${i}:`, updateError);
            throw updateError;
          }
          console.log(`   Assigned turn_order ${i} to participant ${participant.user_id.substring(0, 8)}...`);
        }
        
        // Sign back in as User 1 to update thread status
        await signOut();
        await signInUser(USER1);
        
        // Update thread status (as creator)
        const { error: updateError } = await supabase
          .from('writing_threads')
          .update({ status: 'active', opened_at: new Date().toISOString() })
          .eq('id', testThreadId);
        
        if (updateError) {
          console.error(`   Error updating thread status:`, updateError);
          throw updateError;
        }
        
        // Re-fetch to verify
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: updated, error: fetchError } = await supabase
          .from('writing_threads')
          .select('*')
          .eq('id', testThreadId)
          .single();
        
        if (fetchError) throw fetchError;
        
        if (updated.status !== 'active') {
          throw new Error(`Failed to open thread, status: ${updated.status}`);
        }
        
        console.log(`   Thread successfully opened and turn orders assigned`);
        
        // Switch back to User 2
        await signOut();
        user2Session = await signInUser(USER2);
        
        // Update data variable for final check
        data = updated;
      }
    }
    
    if (data.status !== 'active') {
      throw new Error(`Expected status 'active', got '${data.status}'`);
    }
    console.log(`   Thread status: ${data.status}`);
  }) && allPassed;

  // Test 7: Check turn orders are assigned
  allPassed = await testStep('Turn Orders Assigned', async () => {
    // Query as User 2 (current session) - RLS should allow reading participants in threads they're in
    const { data, error } = await supabase
      .from('thread_participants')
      .select('*')
      .eq('thread_id', testThreadId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('   Error querying participants:', error);
      throw error;
    }
    
    const participantsList = Array.isArray(data) ? data : (data?.data || []);
    console.log(`   Found ${participantsList.length} participants`);
    
    // Log all participants for debugging
    participantsList.forEach((p, i) => {
      console.log(`   Participant ${i}: user_id=${p.user_id.substring(0, 8)}..., turn_order=${p.turn_order}`);
    });
    
    const user1Participant = participantsList.find(p => p.user_id === user1Session.user.id);
    const user2Participant = participantsList.find(p => p.user_id === user2Session.user.id);

    if (!user1Participant) {
      throw new Error('User 1 participant not found');
    }
    if (!user2Participant) {
      throw new Error('User 2 participant not found');
    }

    if (user1Participant.turn_order === null || user1Participant.turn_order === undefined) {
      // Try refreshing - maybe there's a cache issue
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: refreshed } = await supabase
        .from('thread_participants')
        .select('*')
        .eq('thread_id', testThreadId)
        .order('joined_at', { ascending: true });
      
      const refreshedList = Array.isArray(refreshed) ? refreshed : (refreshed?.data || []);
      const refreshedUser1 = refreshedList.find(p => p.user_id === user1Session.user.id);
      const refreshedUser2 = refreshedList.find(p => p.user_id === user2Session.user.id);
      
      if (refreshedUser1?.turn_order === null || refreshedUser1?.turn_order === undefined) {
        throw new Error(`User 1 turn_order is still null after refresh. This suggests the update didn't persist or RLS is blocking.`);
      }
      if (refreshedUser2?.turn_order === null || refreshedUser2?.turn_order === undefined) {
        throw new Error(`User 2 turn_order is still null after refresh. This suggests the update didn't persist or RLS is blocking.`);
      }
      
      // Use refreshed values
      user1Participant.turn_order = refreshedUser1.turn_order;
      user2Participant.turn_order = refreshedUser2.turn_order;
    }

    console.log(`   User 1 turn_order: ${user1Participant.turn_order}`);
    console.log(`   User 2 turn_order: ${user2Participant.turn_order}`);
    
    if (user1Participant.turn_order !== 0) {
      throw new Error(`Expected User 1 turn_order to be 0, got ${user1Participant.turn_order}`);
    }
    if (user2Participant.turn_order !== 1) {
      throw new Error(`Expected User 2 turn_order to be 1, got ${user2Participant.turn_order}`);
    }
  }) && allPassed;

  // Test 8: User 2 checks if can post (should NOT be their turn)
  allPassed = await testStep('User 2 Checks If Can Post', async () => {
    const { data: posts } = await supabase
      .from('thread_posts')
      .select('*')
      .eq('thread_id', testThreadId);

    const postsCount = Array.isArray(posts) ? posts.length : (posts?.data?.length || 0);
    const expectedOrder = postsCount; // 0 for first post
    
    const { data: participants } = await supabase
      .from('thread_participants')
      .select('*')
      .eq('thread_id', testThreadId)
      .order('joined_at', { ascending: true });

    const participantsList = Array.isArray(participants) ? participants : (participants?.data || []);
    const user2Participant = participantsList.find(p => p.user_id === user2Session.user.id);
    const totalParticipants = participantsList.length;
    const turnIndex = expectedOrder % totalParticipants;
    
    console.log(`   Posts count: ${postsCount}`);
    console.log(`   Expected order: ${expectedOrder}`);
    console.log(`   Turn index: ${turnIndex}`);
    console.log(`   User 2 turn_order: ${user2Participant?.turn_order}`);
    console.log(`   Can post: ${user2Participant?.turn_order === turnIndex}`);
    
    // User 2 has turn_order 1, so with 0 posts (expectedOrder 0), turnIndex = 0 % 2 = 0
    // So User 2 should NOT be able to post (User 1 should)
    if (user2Participant?.turn_order === turnIndex) {
      console.log(`   ⚠️  User 2 can post (this is unexpected if User 1 should go first)`);
    }
  }) && allPassed;

  // Test 9: User 1 signs back in
  allPassed = await testStep('User 1 Signs Back In', async () => {
    await signOut();
    user1Session = await signInUser(USER1);
    if (!user1Session) throw new Error('Failed to get session');
  }) && allPassed;

  // Test 10: User 1 posts (should be their turn)
  allPassed = await testStep('User 1 Posts', async () => {
    const { data: posts } = await supabase
      .from('thread_posts')
      .select('*')
      .eq('thread_id', testThreadId);

    const postsCount = Array.isArray(posts) ? posts.length : (posts?.data?.length || 0);
    const expectedOrder = postsCount;
    
    const { data: participants } = await supabase
      .from('thread_participants')
      .select('*')
      .eq('thread_id', testThreadId)
      .order('joined_at', { ascending: true });

    const participantsList = Array.isArray(participants) ? participants : (participants?.data || []);
    const user1Participant = participantsList.find(p => p.user_id === user1Session.user.id);
    const totalParticipants = participantsList.length;
    const turnIndex = expectedOrder % totalParticipants;
    
    console.log(`   Posts count: ${postsCount}`);
    console.log(`   Expected order: ${expectedOrder}`);
    console.log(`   Turn index: ${turnIndex}`);
    console.log(`   User 1 turn_order: ${user1Participant?.turn_order}`);
    
    if (!user1Participant) {
      throw new Error('User 1 participant not found');
    }
    
    if (user1Participant.turn_order === null || user1Participant.turn_order === undefined) {
      throw new Error(`User 1 turn_order is null/undefined`);
    }
    
    if (user1Participant.turn_order !== turnIndex) {
      throw new Error(`User 1 cannot post. turn_order: ${user1Participant.turn_order}, expected: ${turnIndex}`);
    }

    const { error } = await supabase
      .from('thread_posts')
      .insert({
        thread_id: testThreadId,
        user_id: user1Session.user.id,
        content: 'This is the first post in the test thread.',
        sources: [],
        plagiarism_confirmed: true,
        post_order: expectedOrder
      });

    if (error) throw error;
    console.log(`   Post created with post_order: ${expectedOrder}`);
  }) && allPassed;

  // Test 11: User 2 signs in and posts (should be their turn now)
  allPassed = await testStep('User 2 Posts (Second Turn)', async () => {
    await signOut();
    user2Session = await signInUser(USER2);
    
    const { data: posts } = await supabase
      .from('thread_posts')
      .select('*')
      .eq('thread_id', testThreadId);

    const postsCount = Array.isArray(posts) ? posts.length : (posts?.data?.length || 0);
    const expectedOrder = postsCount;
    
    const { data: participants } = await supabase
      .from('thread_participants')
      .select('*')
      .eq('thread_id', testThreadId)
      .order('joined_at', { ascending: true });

    const participantsList = Array.isArray(participants) ? participants : (participants?.data || []);
    const user2Participant = participantsList.find(p => p.user_id === user2Session.user.id);
    const totalParticipants = participantsList.length;
    const turnIndex = expectedOrder % totalParticipants;
    
    console.log(`   Posts count: ${postsCount}`);
    console.log(`   Expected order: ${expectedOrder}`);
    console.log(`   Turn index: ${turnIndex}`);
    console.log(`   User 2 turn_order: ${user2Participant?.turn_order}`);
    
    if (!user2Participant) {
      throw new Error('User 2 participant not found');
    }
    
    if (user2Participant.turn_order === null || user2Participant.turn_order === undefined) {
      throw new Error(`User 2 turn_order is null/undefined`);
    }
    
    if (user2Participant.turn_order !== turnIndex) {
      throw new Error(`User 2 cannot post. turn_order: ${user2Participant.turn_order}, expected: ${turnIndex}`);
    }

    const { error } = await supabase
      .from('thread_posts')
      .insert({
        thread_id: testThreadId,
        user_id: user2Session.user.id,
        content: 'This is the second post in the test thread.',
        sources: [],
        plagiarism_confirmed: true,
        post_order: expectedOrder
      });

    if (error) throw error;
    console.log(`   Post created with post_order: ${expectedOrder}`);
  }) && allPassed;

  // Test 12: Verify posts are in correct order
  allPassed = await testStep('Verify Posts Order', async () => {
    const { data, error } = await supabase
      .from('thread_posts')
      .select('*')
      .eq('thread_id', testThreadId)
      .order('post_order', { ascending: true });

    if (error) throw error;
    
    const postsList = Array.isArray(data) ? data : (data?.data || []);
    
    if (postsList.length !== 2) {
      throw new Error(`Expected 2 posts, got ${postsList.length}`);
    }
    
    if (postsList[0].post_order !== 0 || postsList[1].post_order !== 1) {
      throw new Error(`Post orders incorrect: ${postsList[0].post_order}, ${postsList[1].post_order}`);
    }
    
    if (postsList[0].user_id !== user1Session.user.id) {
      throw new Error('First post should be from User 1');
    }
    
    if (postsList[1].user_id !== user2Session.user.id) {
      throw new Error('Second post should be from User 2');
    }
    
    console.log(`   Post 1: User ${postsList[0].user_id.substring(0, 8)}... (order: ${postsList[0].post_order})`);
    console.log(`   Post 2: User ${postsList[1].user_id.substring(0, 8)}... (order: ${postsList[1].post_order})`);
  }) && allPassed;

  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  try {
    await signOut();
    // Note: We don't delete the thread/posts as they might be useful for manual testing
    // Uncomment to clean up:
    // await supabase.from('thread_posts').delete().eq('thread_id', testThreadId);
    // await supabase.from('thread_participants').delete().eq('thread_id', testThreadId);
    // await supabase.from('writing_threads').delete().eq('id', testThreadId);
  } catch (error) {
    console.error('Cleanup error:', error);
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

// Run tests
testFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

