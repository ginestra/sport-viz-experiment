import { writable } from 'svelte/store';
import { supabase } from '../lib/supabase/client.js';

export const user = writable(null);
export const session = writable(null);
export const loading = writable(true);

// Session store (separate for easier access)
const sessionStore = writable(null);
export { sessionStore };

// Initialize auth state (only in browser)
if (typeof window !== 'undefined') {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    sessionStore.set(session);
    user.set(session?.user ?? null);
    loading.set(false);
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    sessionStore.set(session);
    user.set(session?.user ?? null);
    loading.set(false);
  });
}

// Auth helper functions
export const auth = {
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signInWithOAuth(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/#/collaborative`,
      },
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/collaborative/reset-password`,
    });
    return { data, error };
  },

  async deleteAccount(userId) {
    // This should be called via an API endpoint with service role key
    // For now, we'll return an error directing to use the API
    return {
      error: {
        message: 'Account deletion must be performed through the account settings page'
      }
    };
  },

  async exportUserData() {
    // This will be handled client-side in the AccountSettings component
    return { data: null, error: null };
  },
};
