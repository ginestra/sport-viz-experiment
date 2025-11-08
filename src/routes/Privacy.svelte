<script>
  import { link } from 'svelte-spa-router';
</script>

<div class="privacy-page">
  <div class="page-header">
    <h1>Privacy Policy</h1>
    <p class="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
  </div>

  <div class="content">
    <section>
      <h2>1. Introduction</h2>
      <p>
        This Privacy Policy explains how That Lab ("we", "our", or "us") collects, uses, 
        and protects your personal information when you use our collaborative writing platform.
      </p>
      <p>
        We are committed to protecting your privacy and ensuring compliance with the General 
        Data Protection Regulation (GDPR) and other applicable data protection laws.
      </p>
    </section>

    <section>
      <h2>2. Data Controller</h2>
      <p>
        That Lab is the data controller for your personal data. If you have questions about 
        this privacy policy or your data, please contact us.
      </p>
    </section>

    <section>
      <h2>3. Information We Collect</h2>
      <h3>3.1 Account Information</h3>
      <ul>
        <li>Email address (required for account creation)</li>
        <li>Password (encrypted and hashed)</li>
        <li>Account creation date and last sign-in information</li>
      </ul>

      <h3>3.2 Content You Create</h3>
      <ul>
        <li>Writing threads you create (themes, participant settings)</li>
        <li>Posts you write in collaborative threads</li>
        <li>Sources you add to your posts</li>
        <li>Plagiarism confirmation acknowledgments</li>
      </ul>

      <h3>3.3 Technical Information</h3>
      <ul>
        <li>IP address (for security and analytics)</li>
        <li>Browser type and version</li>
        <li>Device information</li>
        <li>Usage patterns and interactions with the platform</li>
      </ul>
    </section>

    <section>
      <h2>4. How We Use Your Information</h2>
      <p>We use your personal information to:</p>
      <ul>
        <li>Provide and maintain the collaborative writing service</li>
        <li>Authenticate your identity and manage your account</li>
        <li>Enable real-time collaboration features</li>
        <li>Send important service notifications (e.g., email verification)</li>
        <li>Ensure platform security and prevent abuse</li>
        <li>Comply with legal obligations</li>
      </ul>
      <p>
        We do not sell, rent, or share your personal information with third parties for 
        marketing purposes.
      </p>
    </section>

    <section>
      <h2>5. Legal Basis for Processing</h2>
      <p>Under GDPR, we process your data based on:</p>
      <ul>
        <li><strong>Consent:</strong> When you create an account, you consent to data processing</li>
        <li><strong>Contract:</strong> To provide the services you've requested</li>
        <li><strong>Legitimate Interest:</strong> For security, fraud prevention, and platform improvement</li>
        <li><strong>Legal Obligation:</strong> To comply with applicable laws</li>
      </ul>
    </section>

    <section>
      <h2>6. Data Storage and Security</h2>
      <p>
        Your data is stored securely using Supabase, which provides enterprise-grade security:
      </p>
      <ul>
        <li>Data encryption in transit (HTTPS/TLS)</li>
        <li>Data encryption at rest</li>
        <li>Regular security audits and updates</li>
        <li>Access controls and authentication</li>
      </ul>
      <p>
        We implement additional security measures including password hashing, session management, 
        and input validation to protect against unauthorized access.
      </p>
    </section>

    <section>
      <h2>7. Data Retention</h2>
      <p>
        We retain your personal data for as long as your account is active or as needed to 
        provide services. When you delete your account:
      </p>
      <ul>
        <li>Your account and authentication data are permanently deleted</li>
        <li>Your posts are removed from collaborative threads</li>
        <li>Threads you created are deleted if they have no other participants</li>
        <li>Your participation records are removed</li>
      </ul>
      <p>
        Some data may be retained for a limited period for legal compliance or security purposes, 
        but will be deleted as soon as legally permissible.
      </p>
    </section>

    <section>
      <h2>8. Your Rights Under GDPR</h2>
      <p>You have the following rights regarding your personal data:</p>
      
      <h3>8.1 Right to Access</h3>
      <p>You can request a copy of all personal data we hold about you.</p>

      <h3>8.2 Right to Rectification</h3>
      <p>You can update your account information at any time through your account settings.</p>

      <h3>8.3 Right to Erasure ("Right to be Forgotten")</h3>
      <p>
        You can delete your account and all associated data at any time through the 
        <a href="#/collaborative/settings" use:link>Account Settings</a> page.
      </p>

      <h3>8.4 Right to Data Portability</h3>
      <p>
        You can export your data in a machine-readable format (JSON) using the 
        <a href="#/collaborative/settings" use:link>Export Data</a> feature.
      </p>

      <h3>8.5 Right to Object</h3>
      <p>You can object to certain types of data processing. Contact us to exercise this right.</p>

      <h3>8.6 Right to Restrict Processing</h3>
      <p>You can request that we limit how we process your data in certain circumstances.</p>

      <h3>8.7 Right to Withdraw Consent</h3>
      <p>
        You can withdraw your consent at any time by deleting your account or contacting us.
      </p>
    </section>

    <section>
      <h2>9. Cookies and Tracking</h2>
      <p>
        We use essential cookies and local storage to maintain your session and preferences. 
        These are necessary for the platform to function properly. We do not use tracking 
        cookies or third-party analytics without your explicit consent.
      </p>
    </section>

    <section>
      <h2>10. Third-Party Services</h2>
      <p>
        We use the following third-party services that may process your data:
      </p>
      <ul>
        <li><strong>Supabase:</strong> Database and authentication services (privacy policy: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a>)</li>
        <li><strong>Vercel:</strong> Hosting and deployment (privacy policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">vercel.com/legal/privacy-policy</a>)</li>
      </ul>
      <p>
        These services are GDPR-compliant and process data only as necessary to provide 
        their services to us.
      </p>
    </section>

    <section>
      <h2>11. International Data Transfers</h2>
      <p>
        Your data may be processed and stored outside the European Economic Area (EEA). 
        We ensure appropriate safeguards are in place, including:
      </p>
      <ul>
        <li>Standard Contractual Clauses (SCCs)</li>
        <li>GDPR-compliant data processing agreements</li>
        <li>Encryption and security measures</li>
      </ul>
    </section>

    <section>
      <h2>12. Children's Privacy</h2>
      <p>
        Our service is not intended for users under 16 years of age. We do not knowingly 
        collect personal information from children. If you believe we have collected data 
        from a child, please contact us immediately.
      </p>
    </section>

    <section>
      <h2>13. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any 
        material changes by posting the new policy on this page and updating the "Last updated" 
        date. Your continued use of the service after changes constitutes acceptance.
      </p>
    </section>

    <section>
      <h2>14. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or wish to exercise your rights, 
        please contact us through your account settings or the platform's contact methods.
      </p>
    </section>
  </div>

  <div class="footer-actions">
    <a href="#/" use:link class="back-link">← Back to Home</a>
  </div>
</div>

<style>
  .privacy-page {
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

  .content strong {
    color: var(--text-color);
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

