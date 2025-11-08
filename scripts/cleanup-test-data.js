#!/usr/bin/env node

/**
 * Cleanup script to remove all test threads and related data
 * 
 * Usage: node scripts/cleanup-test-data.js
 * 
 * This script will:
 * - Find all threads with "Test" in the theme (case-insensitive)
 * - Delete all posts in those threads
 * - Delete all participants in those threads
 * - Delete the threads themselves
 * 
 * Note: Uses service role key to bypass RLS for cleanup operations
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('Note: Using service role key to bypass RLS for cleanup');
  process.exit(1);
}

// Use service role key to bypass RLS for cleanup operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupTestThreads() {
  console.log('🧹 Starting cleanup of test threads...\n');

  try {
    // Find all test threads (threads with "Test" in theme - case insensitive)
    const { data: testThreads, error: threadsError } = await supabase
      .from('writing_threads')
      .select('id, theme')
      .ilike('theme', '%Test%');

    if (threadsError) {
      console.error('❌ Error fetching test threads:', threadsError);
      process.exit(1);
    }

    if (!testThreads || testThreads.length === 0) {
      console.log('✅ No test threads found. Nothing to clean up.');
      return;
    }

    console.log(`📋 Found ${testThreads.length} test thread(s):`);
    testThreads.forEach(thread => {
      console.log(`   - ${thread.theme} (${thread.id})`);
    });
    console.log('');

    let deletedCount = 0;
    let errorCount = 0;

    for (const thread of testThreads) {
      try {
        console.log(`🗑️  Cleaning up thread: ${thread.theme}...`);

        // 1. Delete all posts in this thread
        const { error: postsError } = await supabase
          .from('thread_posts')
          .delete()
          .eq('thread_id', thread.id);

        if (postsError) {
          console.error(`   ⚠️  Error deleting posts: ${postsError.message}`);
        } else {
          console.log(`   ✅ Deleted posts`);
        }

        // 2. Delete all participants in this thread
        const { error: participantsError } = await supabase
          .from('thread_participants')
          .delete()
          .eq('thread_id', thread.id);

        if (participantsError) {
          console.error(`   ⚠️  Error deleting participants: ${participantsError.message}`);
        } else {
          console.log(`   ✅ Deleted participants`);
        }

        // 3. Delete the thread itself
        const { error: threadError } = await supabase
          .from('writing_threads')
          .delete()
          .eq('id', thread.id);

        if (threadError) {
          console.error(`   ⚠️  Error deleting thread: ${threadError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Deleted thread`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error cleaning up thread ${thread.id}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Cleanup complete!`);
    console.log(`   Deleted: ${deletedCount} thread(s)`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} thread(s)`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupTestThreads();

