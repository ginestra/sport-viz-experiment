#!/usr/bin/env node

/**
 * List all threads in the database
 * 
 * Usage: node scripts/list-threads.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listThreads() {
  console.log('📋 Listing all threads...\n');

  try {
    const { data: threads, error } = await supabase
      .from('writing_threads')
      .select('id, theme, status, created_at, min_participants, max_participants')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching threads:', error);
      process.exit(1);
    }

    if (!threads || threads.length === 0) {
      console.log('✅ No threads found in database.');
      return;
    }

    console.log(`Found ${threads.length} thread(s):\n`);
    threads.forEach((thread, index) => {
      const date = new Date(thread.created_at).toLocaleString();
      console.log(`${index + 1}. ${thread.theme}`);
      console.log(`   ID: ${thread.id}`);
      console.log(`   Status: ${thread.status}`);
      console.log(`   Participants: ${thread.min_participants}-${thread.max_participants}`);
      console.log(`   Created: ${date}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

listThreads();

