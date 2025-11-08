<script>
  import { link } from 'svelte-spa-router';
</script>

<div class="terms-page">
  <div class="page-header">
    <h1>Terms of Service</h1>
    <p class="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
  </div>

  <div class="content">
    <section>
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing and using That Lab's collaborative writing platform, you accept and agree 
        to be bound by the terms and provision of this agreement. If you do not agree to abide 
        by the above, please do not use this service.
      </p>
    </section>

    <section>
      <h2>2. Description of Service</h2>
      <p>
        That Lab provides a collaborative writing platform where users can create and participate 
        in writing threads. The service allows users to:
      </p>
      <ul>
        <li>Create writing threads with themes and participant requirements</li>
        <li>Participate in collaborative writing exercises</li>
        <li>Add sources and citations to their writing</li>
        <li>Confirm responsibility for original content</li>
      </ul>
    </section>

    <section>
      <h2>3. User Accounts</h2>
      <h3>3.1 Account Creation</h3>
      <p>
        To use certain features of the service, you must create an account. You agree to:
      </p>
      <ul>
        <li>Provide accurate, current, and complete information</li>
        <li>Maintain and update your information to keep it accurate</li>
        <li>Maintain the security of your password</li>
        <li>Accept responsibility for all activities under your account</li>
      </ul>

      <h3>3.2 Account Security</h3>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials. 
        You agree to notify us immediately of any unauthorized use of your account.
      </p>
    </section>

    <section>
      <h2>4. User Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service for any illegal purpose or in violation of any laws</li>
        <li>Post content that is defamatory, harassing, or harmful</li>
        <li>Infringe on intellectual property rights of others</li>
        <li>Post plagiarized content (you must confirm originality)</li>
        <li>Attempt to gain unauthorized access to the service</li>
        <li>Interfere with or disrupt the service or servers</li>
        <li>Use automated systems to access the service without permission</li>
      </ul>
    </section>

    <section>
      <h2>5. Content and Intellectual Property</h2>
      <h3>5.1 Your Content</h3>
      <p>
        You retain ownership of the content you create and post on the platform. By posting content, 
        you grant That Lab a non-exclusive, worldwide, royalty-free license to use, display, and 
        distribute your content solely for the purpose of operating and providing the service.
      </p>

      <h3>5.2 Originality and Plagiarism</h3>
      <p>
        You confirm that all content you post is original or properly attributed. You acknowledge 
        responsibility for ensuring your content does not infringe on the rights of others. 
        Plagiarism is strictly prohibited.
      </p>

      <h3>5.3 Content Removal</h3>
      <p>
        We reserve the right to remove any content that violates these terms or is otherwise 
        objectionable, at our sole discretion.
      </p>
    </section>

    <section>
      <h2>6. Privacy</h2>
      <p>
        Your use of the service is also governed by our 
        <a href="#/privacy" use:link>Privacy Policy</a>. Please review the Privacy Policy to 
        understand how we collect, use, and protect your information.
      </p>
    </section>

    <section>
      <h2>7. Service Availability</h2>
      <p>
        We strive to provide reliable service but do not guarantee that the service will be 
        available at all times. We may experience downtime for maintenance, updates, or other 
        reasons. We are not liable for any loss or damage resulting from service unavailability.
      </p>
    </section>

    <section>
      <h2>8. Termination</h2>
      <p>
        You may terminate your account at any time through the account settings page. We reserve 
        the right to suspend or terminate your account if you violate these terms. Upon termination, 
        your right to use the service will immediately cease, and we may delete your account and 
        data in accordance with our Privacy Policy.
      </p>
    </section>

    <section>
      <h2>9. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, That Lab shall not be liable for any indirect, 
        incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
        whether incurred directly or indirectly, or any loss of data, use, goodwill, or other 
        intangible losses resulting from your use of the service.
      </p>
    </section>

    <section>
      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless That Lab from any claims, damages, losses, 
        liabilities, and expenses (including legal fees) arising out of or related to your use 
        of the service, your content, or your violation of these terms.
      </p>
    </section>

    <section>
      <h2>11. Changes to Terms</h2>
      <p>
        We reserve the right to modify these terms at any time. We will notify users of material 
        changes by posting the updated terms on this page and updating the "Last updated" date. 
        Your continued use of the service after changes constitutes acceptance of the new terms.
      </p>
    </section>

    <section>
      <h2>12. Governing Law</h2>
      <p>
        These terms shall be governed by and construed in accordance with applicable data protection 
        laws, including GDPR where applicable. Any disputes arising from these terms or your use of 
        the service shall be resolved in accordance with applicable law.
      </p>
    </section>

    <section>
      <h2>13. Contact</h2>
      <p>
        If you have questions about these Terms of Service, please contact us through your 
        account settings or the platform's contact methods.
      </p>
    </section>
  </div>

  <div class="footer-actions">
    <a href="#/" use:link class="back-link">← Back to Home</a>
  </div>
</div>

<style>
  .terms-page {
    padding: 2rem 1rem;
    max-width: 900px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .page-header h1 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color);
    font-size: 2rem;
  }

  .last-updated {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .content {
    line-height: 1.8;
    color: var(--text-color);
  }

  .content section {
    margin-bottom: 3rem;
  }

  .content h2 {
    margin: 0 0 1rem 0;
    color: var(--text-color);
    font-size: 1.5rem;
    padding-top: 1rem;
  }

  .content h3 {
    margin: 1.5rem 0 0.75rem 0;
    color: var(--text-color);
    font-size: 1.2rem;
  }

  .content p {
    margin: 0.75rem 0;
    color: var(--text-secondary);
  }

  .content ul {
    margin: 0.75rem 0;
    padding-left: 2rem;
    color: var(--text-secondary);
  }

  .content li {
    margin: 0.5rem 0;
  }

  .content a {
    color: var(--primary-color);
    text-decoration: none;
  }

  .content a:hover {
    text-decoration: underline;
  }

  .footer-actions {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border-color);
  }

  .back-link {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }
</style>

