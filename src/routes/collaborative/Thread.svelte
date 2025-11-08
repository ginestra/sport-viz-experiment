<script>
  import { onMount, onDestroy } from 'svelte';
  import { user } from '../../stores/auth.js';
  import { link } from 'svelte-spa-router';
  import { supabase } from '../../lib/supabase/client.js';
  import { isUserBlocked } from '../../lib/moderation/blocks.js';
  import PostForm from '../../components/collaborative/PostForm.svelte';
  import FlagPostButton from '../../components/collaborative/FlagPostButton.svelte';
  import UserWarningBanner from '../../components/collaborative/UserWarningBanner.svelte';
  import BlockedUserBanner from '../../components/collaborative/BlockedUserBanner.svelte';

  import { location } from 'svelte-spa-router';

  // Extract thread ID from URL path
  let threadId = '';
  $: {
    const pathParts = $location.split('/');
    const threadIndex = pathParts.indexOf('thread');
    threadId = threadIndex !== -1 && pathParts[threadIndex + 1] ? pathParts[threadIndex + 1] : '';
  }
  
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
  
  // Generate color for each contributor based on their user_id
  let contributorColors = {};
  
  function getContributorColor(userId) {
    if (!contributorColors[userId]) {
      // Generate a consistent color based on user_id hash
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
      }
      // Generate a color with good contrast (avoid too light colors)
      const hue = Math.abs(hash) % 360;
      const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
      const lightness = 45 + (Math.abs(hash) % 15); // 45-60%
      contributorColors[userId] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    return contributorColors[userId];
  }
  
  function getContributorName(userId) {
    if (userId === $user?.id) return 'You';
    return postAuthorProfiles[userId] || `User ${userId.substring(0, 8)}...`;
  }
  
  // Split post content into paragraphs for read view
  function splitIntoParagraphs(text) {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }

  // Get current user's turn order and check if it's their turn
  function checkIfCanPost() {
    if (!thread || !currentUserParticipant || thread.status !== 'active') {
      canPost = false;
      return;
    }

    // Check if turn_order is set (should not be null for active threads)
    if (currentUserParticipant.turn_order === null || currentUserParticipant.turn_order === undefined) {
      console.warn('User turn_order is null/undefined', currentUserParticipant);
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
    
    // Debug logging
    console.log('Turn check:', {
      userTurnOrder,
      expectedTurnOrder,
      expectedOrder,
      totalParticipants,
      postsCount: posts.length,
      canPost
    });
  }

  async function loadThread() {
    loading = true;
    error = '';

    try {
      // Load thread
      const { data: threadData, error: threadError } = await supabase
        .from('writing_threads')
        .select('*')
        .eq('id', threadId)
        .single();

      if (threadError) throw threadError;
      thread = threadData;

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('thread_participants')
        .select('*')
        .eq('thread_id', threadId)
        .order('joined_at', { ascending: true });

      if (participantsError) throw participantsError;
      participants = participantsData || [];

      // If thread is active but participants don't have turn_order set, fix it
      if (thread.status === 'active' && participants.length > 0) {
        const participantsWithoutTurnOrder = participants.filter(p => p.turn_order === null || p.turn_order === undefined);
        if (participantsWithoutTurnOrder.length > 0) {
          console.warn('Some participants missing turn_order, fixing...', participantsWithoutTurnOrder);
          // Assign turn orders based on join order
          for (let i = 0; i < participants.length; i++) {
            if (participants[i].turn_order === null || participants[i].turn_order === undefined) {
              await supabase
                .from('thread_participants')
                .update({ turn_order: i })
                .eq('id', participants[i].id);
              participants[i].turn_order = i;
            }
          }
        }
      }

      // Load display names for participants
      if (participants.length > 0) {
        const userIds = participants.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);

        if (profilesData) {
          participantProfiles = {};
          profilesData.forEach(profile => {
            participantProfiles[profile.user_id] = profile.display_name;
          });
        }
      }

      // Find current user's participation (after potentially fixing turn_order)
      if ($user) {
        currentUserParticipant = participants.find(p => p.user_id === $user.id);
        isParticipant = !!currentUserParticipant;
        isBlocked = await isUserBlocked($user.id);
        
        // Log for debugging
        if (currentUserParticipant) {
          console.log('Current user participant:', {
            user_id: $user.id,
            turn_order: currentUserParticipant.turn_order,
            thread_status: thread.status
          });
        }
      }

      // Load posts
      await loadPosts();

      // Note: Thread opening is now handled by database trigger
      // But we can still check and open if needed (for backwards compatibility)
      if (thread.status === 'waiting' && participants.length >= thread.min_participants) {
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
      const { data: postsData, error: postsError } = await supabase
        .from('thread_posts')
        .select('*')
        .eq('thread_id', threadId)
        .order('post_order', { ascending: true });

      if (postsError) throw postsError;
      posts = (postsData || []).filter(p => !p.is_removed);

      // Load display names for post authors
      if (posts.length > 0) {
        const userIds = [...new Set(posts.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);

        if (profilesData) {
          postAuthorProfiles = {};
          profilesData.forEach(profile => {
            postAuthorProfiles[profile.user_id] = profile.display_name;
          });
        }
      }
    } catch (err) {
      console.error('Error loading posts:', err);
    }
  }

  async function openThread() {
    try {
      // Assign turn orders to participants
      const updates = participants.map((p, index) => ({
        id: p.id,
        turn_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('thread_participants')
          .update({ turn_order: update.turn_order })
          .eq('id', update.id);
      }

      // Update thread status
      await supabase
        .from('writing_threads')
        .update({
          status: 'active',
          opened_at: new Date().toISOString()
        })
        .eq('id', threadId);

      thread.status = 'active';
      thread.opened_at = new Date().toISOString();
    } catch (err) {
      console.error('Error opening thread:', err);
    }
  }

  async function joinThread() {
    if (!$user || isBlocked) return;

    // Check if thread is full
    if (thread && participants.length >= thread.max_participants) {
      error = 'This thread has reached its maximum number of participants';
      return;
    }

    // Check if thread is already active and at max
    if (thread && thread.status === 'active' && participants.length >= thread.max_participants) {
      error = 'Cannot join an active thread that is full';
      return;
    }

    try {
      const { error: joinError, data: participantData } = await supabase
        .from('thread_participants')
        .insert({
          thread_id: threadId,
          user_id: $user.id
        })
        .select()
        .single();

      if (joinError) {
        // Check if it's a duplicate key error (already a participant)
        if (joinError.code === '23505' || joinError.message.includes('duplicate')) {
          error = 'You are already a participant in this thread';
        } else {
          throw joinError;
        }
        return;
      }

      // If thread is active, assign turn order to new participant
      if (thread && thread.status === 'active' && participantData) {
        // Get the highest turn order and add 1
        const maxTurnOrder = participants.length > 0 
          ? Math.max(...participants.map(p => p.turn_order ?? -1))
          : -1;
        
        await supabase
          .from('thread_participants')
          .update({ turn_order: maxTurnOrder + 1 })
          .eq('id', participantData.id);
      }

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
      if (wordCount > 500) {
        error = 'Post exceeds 500 word limit';
        return;
      }

      if (wordCount === 0) {
        error = 'Post cannot be empty';
        return;
      }

      // Sanitize content
      const sanitizedContent = postData.content.trim();
      
      // Sanitize sources
      const sanitizedSources = (postData.sources || []).map(source => ({
        title: (source.title || '').trim(),
        url: (source.url || '').trim(),
        citation: (source.citation || '').trim()
      })).filter(s => s.title || s.url || s.citation);

      const { error: postError } = await supabase
        .from('thread_posts')
        .insert({
          thread_id: threadId,
          user_id: $user.id,
          content: sanitizedContent,
          sources: sanitizedSources,
          plagiarism_confirmed: postData.plagiarism_confirmed,
          post_order: nextPostOrder
        });

      if (postError) throw postError;

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

  function getWordCount(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  onMount(() => {
    if (threadId) {
      loadThread();

      // Subscribe to real-time updates
      subscription = supabase
        .channel(`thread_${threadId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'thread_posts', filter: `thread_id=eq.${threadId}` },
          () => {
            loadPosts();
            checkIfCanPost();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'thread_participants', filter: `thread_id=eq.${threadId}` },
          () => {
            loadThread();
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'writing_threads', filter: `id=eq.${threadId}` },
          () => {
            loadThread();
          }
        )
        .subscribe();
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
    <div class="thread-header-section">
      <a href="#/collaborative" use:link class="back-link">← Back to Threads</a>
      <h1>{thread.theme}</h1>
      <div class="thread-meta">
        <span class="status-badge status-{thread.status}">{thread.status}</span>
        <span>{participants.length} / {thread.max_participants} participants</span>
        {#if thread.status === 'waiting'}
          <span>Waiting for {thread.min_participants - participants.length} more participant(s)</span>
        {/if}
      </div>
    </div>

    {#if thread.status === 'waiting'}
      <div class="waiting-notice">
        <p>This thread is waiting for more participants. Once {thread.min_participants} participants join, the thread will open and collaborative writing can begin.</p>
        {#if $user && !isParticipant && !isBlocked && participants.length < thread.max_participants}
          <button on:click={joinThread} class="join-button">Join Thread</button>
        {:else if !$user}
          <p><a href="#/collaborative/login" use:link>Sign in</a> to join this thread.</p>
        {:else if isBlocked}
          <p>You cannot join threads while your account is blocked.</p>
        {:else if participants.length >= thread.max_participants}
          <p>This thread has reached its maximum number of participants.</p>
        {/if}
      </div>
    {/if}

    {#if thread.status === 'active'}
      <div class="participants-section">
        <h3>Participants (Turn Order)</h3>
        <div class="participants-list">
          {#each participants.sort((a, b) => (a.turn_order ?? 999) - (b.turn_order ?? 999)) as participant}
            <div class="participant-item">
              <span class="turn-order">{participant.turn_order !== null ? participant.turn_order + 1 : '—'}</span>
              <span class="participant-id">
                {participant.user_id === $user?.id 
                  ? 'You' 
                  : (participantProfiles[participant.user_id] || `User ${participant.user_id.substring(0, 8)}...`)}
              </span>
            </div>
          {/each}
        </div>
      </div>

      {#if isParticipant}
        {#if canPost}
          <PostForm {threadId} onSubmit={handlePostSubmit} />
        {:else}
          <div class="wait-turn-notice">
            <p>It's not your turn yet. Please wait for other participants to post.</p>
          </div>
        {/if}
      {:else if $user && !isBlocked && participants.length < thread.max_participants}
        <div class="join-prompt">
          <p>You're not a participant in this thread. <button on:click={joinThread} class="join-button">Join Thread</button></p>
        </div>
      {:else if $user && !isBlocked && participants.length >= thread.max_participants}
        <div class="join-prompt">
          <p>This thread has reached its maximum number of participants.</p>
        </div>
      {/if}
    {/if}

    <div class="posts-section">
      <div class="posts-header">
        <h2>Posts ({posts.length})</h2>
        {#if posts.length > 0}
          <div class="view-toggle">
            <button 
              class="toggle-button {viewMode === 'write' ? 'active' : ''}"
              on:click={() => viewMode = 'write'}
            >
              Write Mode
            </button>
            <button 
              class="toggle-button {viewMode === 'read' ? 'active' : ''}"
              on:click={() => viewMode = 'read'}
            >
              Read Mode
            </button>
          </div>
        {/if}
      </div>
      
      {#if posts.length === 0}
        <div class="empty-posts">No posts yet. Be the first to write!</div>
      {:else if viewMode === 'write'}
        <div class="posts-list write-view">
          {#each posts as post}
            <div 
              class="post-item"
              style="border-left: 4px solid {getContributorColor(post.user_id)}"
            >
              <div class="post-header">
                <span class="post-order">Post #{post.post_order + 1}</span>
                <span class="post-author">
                  {getContributorName(post.user_id)}
                </span>
                <span class="post-date">{new Date(post.created_at).toLocaleString()}</span>
                {#if $user && post.user_id !== $user?.id}
                  <FlagPostButton postId={post.id} />
                {/if}
              </div>
              <div class="post-content">
                {#each splitIntoParagraphs(post.content) as paragraph}
                  <p 
                    class="content-paragraph"
                    style="border-left: 3px solid {getContributorColor(post.user_id)}"
                  >
                    {paragraph.trim()}
                  </p>
                {/each}
              </div>
              {#if post.sources && post.sources.length > 0}
                <div class="post-sources">
                  <strong>Sources:</strong>
                  <ul>
                    {#each post.sources as source}
                      <li>
                        {#if source.url}
                          <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || source.url}</a>
                        {:else}
                          {source.title}
                        {/if}
                        {#if source.citation}
                          <span class="citation"> — {source.citation}</span>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
              {#if post.plagiarism_confirmed}
                <div class="plagiarism-badge">✓ Originality Confirmed</div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="posts-list read-view">
          <div class="read-view-content">
            {#each posts as post}
              {#each splitIntoParagraphs(post.content) as paragraph}
                <p 
                  class="read-paragraph"
                  style="border-left: 4px solid {getContributorColor(post.user_id)}"
                  title="{getContributorName(post.user_id)}"
                >
                  {paragraph.trim()}
                </p>
              {/each}
            {/each}
          </div>
          <div class="read-view-metadata">
            <h3>Contributors</h3>
            <div class="contributors-list">
              {#each [...new Set(posts.map(p => p.user_id))] as userId}
                <div class="contributor-item">
                  <span 
                    class="contributor-color"
                    style="background-color: {getContributorColor(userId)}"
                  ></span>
                  <span class="contributor-name">{getContributorName(userId)}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
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

  .back-link {
    display: inline-block;
    margin-bottom: 1rem;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back-link:hover {
    color: var(--primary-color);
  }

  .thread-header-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--border-color);
  }

  .thread-header-section h1 {
    margin: 0.5rem 0;
    color: var(--text-color);
    font-size: 2rem;
  }

  .thread-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .status-waiting {
    background: rgba(251, 191, 36, 0.2);
    color: #f59e0b;
  }

  .status-active {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .waiting-notice,
  .wait-turn-notice,
  .join-prompt {
    padding: 1.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin: 2rem 0;
    text-align: center;
  }

  .join-button {
    padding: 0.75rem 1.5rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    margin-top: 1rem;
  }

  .join-button:hover {
    opacity: 0.9;
  }

  .participants-section {
    margin: 2rem 0;
    padding: 1.5rem;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .participants-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
  }

  .participants-list {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .participant-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .turn-order {
    font-weight: 600;
    color: var(--primary-color);
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

  .posts-section h2 {
    margin: 0;
    color: var(--text-color);
  }

  .view-toggle {
    display: flex;
    gap: 0.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 0.25rem;
  }

  .toggle-button {
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 4px;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .toggle-button:hover {
    background: var(--bg-primary);
    color: var(--text-color);
  }

  .toggle-button.active {
    background: var(--primary-color);
    color: white;
  }

  .empty-posts {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  .posts-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .post-item {
    padding: 1.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .post-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .post-order {
    font-weight: 600;
    color: var(--primary-color);
  }

  .post-author {
    font-weight: 500;
    color: var(--text-color);
  }

  .post-date {
    margin-left: auto;
  }

  .post-content {
    color: var(--text-color);
    line-height: 1.8;
    margin-bottom: 1rem;
  }

  .content-paragraph {
    padding-left: 1rem;
    margin: 0.75rem 0;
    line-height: 1.8;
    white-space: pre-wrap;
  }

  .content-paragraph:first-child {
    margin-top: 0;
  }

  .content-paragraph:last-child {
    margin-bottom: 0;
  }

  /* Read View Styles */
  .read-view {
    display: flex;
    gap: 2rem;
    flex-direction: column;
  }

  @media (min-width: 768px) {
    .read-view {
      flex-direction: row;
    }
  }

  .read-view-content {
    flex: 1;
    max-width: 100%;
  }

  @media (min-width: 768px) {
    .read-view-content {
      max-width: 70%;
    }
  }

  .read-paragraph {
    padding: 1rem 1.5rem;
    padding-left: 2rem;
    margin: 1rem 0;
    line-height: 2;
    color: var(--text-color);
    background: var(--bg-secondary);
    border-radius: 4px;
    white-space: pre-wrap;
    transition: all 0.2s ease;
  }

  .read-paragraph:hover {
    background: var(--bg-primary);
    transform: translateX(4px);
  }

  .read-paragraph:first-child {
    margin-top: 0;
  }

  .read-paragraph:last-child {
    margin-bottom: 0;
  }

  .read-view-metadata {
    padding: 1.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    height: fit-content;
  }

  @media (min-width: 768px) {
    .read-view-metadata {
      width: 25%;
      position: sticky;
      top: 2rem;
    }
  }

  .read-view-metadata h3 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1.1rem;
  }

  .contributors-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .contributor-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .contributor-color {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 2px solid var(--border-color);
  }

  .contributor-name {
    color: var(--text-color);
    font-size: 0.9rem;
  }

  .post-sources {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    font-size: 0.9rem;
  }

  .post-sources ul {
    margin: 0.5rem 0 0 1.5rem;
    padding: 0;
  }

  .post-sources li {
    margin: 0.5rem 0;
    color: var(--text-secondary);
  }

  .post-sources a {
    color: var(--primary-color);
    text-decoration: none;
  }

  .post-sources a:hover {
    text-decoration: underline;
  }

  .citation {
    font-style: italic;
  }

  .plagiarism-badge {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 12px;
    color: #22c55e;
    font-size: 0.75rem;
    font-weight: 500;
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

