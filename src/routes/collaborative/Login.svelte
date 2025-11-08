<script>
  import LoginForm from '../../components/auth/LoginForm.svelte';
  import OAuthButtons from '../../components/auth/OAuthButtons.svelte';
</script>

<div class="auth-page">
  <LoginForm />
  <OAuthButtons />
</div>

<style>
  .auth-page {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
</style>

