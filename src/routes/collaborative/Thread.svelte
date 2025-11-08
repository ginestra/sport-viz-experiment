<script>
  import { onMount, onDestroy } from 'svelte';
  import { user } from '../../stores/auth.js';
  import { link } from 'svelte-spa-router';
  import { isUserBlocked } from '../../lib/moderation/blocks.js';
  import { getWordCount, sanitizeSource } from '../../lib/utils/sanitize.js';
  import { MAX_WORDS, THREAD_STATUS } from '../../lib/constants/collaborative.js';
  import { extractThreadId } from '../../lib/utils/router.js';
  import { loadProfiles } from '../../lib/api/profiles.js';
  import { getThread, openThread as openThreadAPI, subscribeToThread } from '../../lib/api/threads.js';
  import { getPosts, createPost } from '../../lib/api/posts.js';
  import { getParticipants, joinThread as joinThreadAPI, fixParticipantTurnOrders } from '../../lib/api/participants.js';
  import UserWarningBanner from '../../components/collaborative/UserWarningBanner.svelte';
  import BlockedUserBanner from '../../components/collaborative/BlockedUserBanner.svelte';
  import ThreadHeader from '../../components/collaborative/ThreadHeader.svelte';
  import ThreadControls from '../../components/collaborative/ThreadControls.svelte';
  import ViewModeToggle from '../../components/collaborative/ViewModeToggle.svelte';
  import PostListView from '../../components/collaborative/PostListView.svelte';
  import ReadView from '../../components/collaborative/ReadView.svelte';

  import { location } from 'svelte-spa-router';

  // Extract thread ID from URL path
  let threadId = '';
  $: threadId = extractThreadId($location);
  
  let thread = null;
  let posts = [];
  let participants = [];
  let participantProfiles = {}; // Map of user_id -> display_name
  let postAuthorProfiles = {}; // Map of user_id -> display_name
  let currentUserParticipant = null;
  let loading = true;
  let error = '';
  let isBlocked = false;
  let isParticipant = false;
  let canPost = false;
  let nextPostOrder = 0;
  let subscription = null;
  let viewMode = 'write'; // 'write' or 'read'
  
  function handleViewModeChange(mode) {
    viewMode = mode;
  }

  // Get current user's turn order and check if it's their turn
  function checkIfCanPost() {
    if (!thread || !currentUserParticipant || thread.status !== THREAD_STATUS.ACTIVE) {
      canPost = false;
      return;
    }

    // Check if turn_order is set (should not be null for active threads)
    if (currentUserParticipant.turn_order === null || currentUserParticipant.turn_order === undefined) {
      canPost = false;
      return;
    }

    // Find the last post to determine next order
    const lastPost = posts.filter(p => !p.is_removed).sort((a, b) => b.post_order - a.post_order)[0];
    const expectedOrder = lastPost ? lastPost.post_order + 1 : 0;

    // Check if it's this user's turn
    const userTurnOrder = Number(currentUserParticipant.turn_order);
    const totalParticipants = participants.length;
    
    // Calculate whose turn it is based on expected order
    // expectedOrder 0 = first turn (turn_order 0), expectedOrder 1 = second turn (turn_order 1), etc.
    const turnIndex = expectedOrder % totalParticipants;
    
    // Convert to number for comparison
    const expectedTurnOrder = Number(turnIndex);
    
    canPost = userTurnOrder === expectedTurnOrder;
    nextPostOrder = expectedOrder;
  }

  async function loadThread() {
    loading = true;
    error = '';

    try {
      // Load thread
      const { data: threadData, error: threadError } = await getThread(threadId);
      if (threadError) throw new Error(threadError.message);
      thread = threadData;

      // Load participants
      const { data: participantsData, error: participantsError } = await getParticipants(threadId);
      if (participantsError) throw new Error(participantsError.message);
      participants = participantsData || [];

      // If thread is active but participants don't have turn_order set, fix it
      if (thread.status === THREAD_STATUS.ACTIVE && participants.length > 0) {
        const { data: fixedParticipants } = await fixParticipantTurnOrders(threadId, participants);
        if (fixedParticipants) {
          participants = fixedParticipants;
        }
      }

      // Load display names for participants
      if (participants.length > 0) {
        const userIds = participants.map(p => p.user_id);
        const profiles = await loadProfiles(userIds);
        participantProfiles = profiles;
      }

      // Find current user's participation (after potentially fixing turn_order)
      if ($user) {
        currentUserParticipant = participants.find(p => p.user_id === $user.id);
        isParticipant = !!currentUserParticipant;
        isBlocked = await isUserBlocked($user.id);
      }

      // Load posts
      await loadPosts();

      // Note: Thread opening is now handled by database trigger
      // But we can still check and open if needed (for backwards compatibility)
      if (thread.status === THREAD_STATUS.WAITING && participants.length >= thread.min_participants) {
        await openThread();
      }

      checkIfCanPost();
    } catch (err) {
      error = err.message || 'Failed to load thread';
      console.error('Error loading thread:', err);
    } finally {
      loading = false;
    }
  }

  async function loadPosts() {
    try {
      const { data: postsData, error: postsError } = await getPosts(threadId);
      if (postsError) throw new Error(postsError.message);
      posts = postsData || [];

      // Load display names for post authors
      if (posts.length > 0) {
        const userIds = [...new Set(posts.map(p => p.user_id))];
        const profiles = await loadProfiles(userIds);
        postAuthorProfiles = profiles;
      }
    } catch (err) {
      console.error('Error loading posts:', err);
    }
  }

  async function openThread() {
    try {
      // Fix turn orders first
      const { data: fixedParticipants } = await fixParticipantTurnOrders(threadId, participants);
      if (fixedParticipants) {
        participants = fixedParticipants;
      }

      // Update thread status
      const { data: updatedThread, error: updateError } = await openThreadAPI(threadId);
      if (updateError) throw new Error(updateError.message);

      if (updatedThread) {
        thread.status = updatedThread.status;
        thread.opened_at = updatedThread.opened_at;
      }
    } catch (err) {
      console.error('Error opening thread:', err);
    }
  }

  async function joinThreadHandler() {
    if (!$user || isBlocked) return;

    // Check if thread is full
    if (thread && participants.length >= thread.max_participants) {
      error = 'This thread has reached its maximum number of participants';
      return;
    }

    // Check if thread is already active and at max
    if (thread && thread.status === THREAD_STATUS.ACTIVE && participants.length >= thread.max_participants) {
      error = 'Cannot join an active thread that is full';
      return;
    }

    try {
      const { data: participantData, error: joinError } = await joinThreadAPI(threadId, $user.id);

      if (joinError) {
        error = joinError.message || 'Failed to join thread';
        return;
      }

      // Reload thread to get updated participant list
      await loadThread();
    } catch (err) {
      error = err.message || 'Failed to join thread';
      console.error('Error joining thread:', err);
    }
  }

  async function handlePostSubmit(postData) {
    if (!canPost || !$user) return;

    try {
      // Validate content length
      const wordCount = getWordCount(postData.content);
      if (wordCount > MAX_WORDS) {
        error = `Post exceeds ${MAX_WORDS} word limit`;
        return;
      }

      if (wordCount === 0) {
        error = 'Post cannot be empty';
        return;
      }

      // Sanitize content
      const sanitizedContent = postData.content.trim();
      
      // Sanitize sources
      const sanitizedSources = (postData.sources || [])
        .map(source => sanitizeSource(source))
        .filter(s => s.title || s.url || s.citation);

      const { error: postError } = await createPost({
        thread_id: threadId,
        user_id: $user.id,
        content: sanitizedContent,
        sources: sanitizedSources,
        plagiarism_confirmed: postData.plagiarism_confirmed,
        post_order: nextPostOrder
      });

      if (postError) throw new Error(postError.message);

      // Reload thread and posts to get updated state
      await loadPosts();
      await loadThread(); // Reload to update participant state
      checkIfCanPost();
      error = ''; // Clear any previous errors
    } catch (err) {
      error = err.message || 'Failed to submit post';
      console.error('Error submitting post:', err);
    }
  }


  onMount(() => {
    if (threadId) {
      loadThread();

      // Subscribe to real-time updates
      subscription = subscribeToThread(threadId, {
        onPostChange: () => {
          loadPosts();
          checkIfCanPost();
        },
        onParticipantChange: () => {
          loadThread();
        },
        onThreadUpdate: () => {
          loadThread();
        }
      });
    }
  });

  onDestroy(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });

  $: if (thread && participants && posts) {
    checkIfCanPost();
  }
</script>

<div class="thread-page">
  <UserWarningBanner />
  <BlockedUserBanner />

  {#if loading}
    <div class="loading">Loading thread...</div>
  {:else if error}
    <div class="error-message">{error}</div>
    <a href="#/collaborative" use:link class="back-link">← Back to Threads</a>
  {:else if !thread}
    <div class="error-message">Thread not found</div>
    <a href="#/collaborative" use:link class="back-link">← Back to Threads</a>
  {:else}
    <ThreadHeader 
      {thread}
      {participants}
      participantProfiles={participantProfiles}
      currentUserId={$user?.id}
    />

    <ThreadControls
      {thread}
      {isParticipant}
      {canPost}
      {isBlocked}
      {participants}
      {threadId}
      onJoin={joinThreadHandler}
      onPostSubmit={handlePostSubmit}
      isAuthenticated={!!$user}
    />

    <div class="posts-section">
      <div class="posts-header">
        <h2>Posts ({posts.length})</h2>
        <ViewModeToggle 
          {viewMode}
          onModeChange={handleViewModeChange}
          postsCount={posts.length}
        />
      </div>
      
      {#if posts.length === 0}
        <div class="empty-posts">No posts yet. Be the first to write!</div>
      {:else if viewMode === 'write'}
        <PostListView
          {posts}
          postAuthorProfiles={postAuthorProfiles}
          currentUserId={$user?.id}
        />
      {:else}
        <ReadView
          {posts}
          postAuthorProfiles={postAuthorProfiles}
          currentUserId={$user?.id}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  .thread-page {
    padding: 2rem 1rem;
    max-width: 1000px;
    margin: 0 auto;
  }


  .posts-section {
    margin-top: 3rem;
  }

  .posts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .posts-header h2 {
    margin: 0;
    color: var(--text-color);
    font-size: 1.5rem;
  }

  .empty-posts {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  .loading,
  .error-message {
    text-align: center;
    padding: 3rem 1rem;
  }

  .error-message {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 4px;
    margin-bottom: 1rem;
  }
</style>

