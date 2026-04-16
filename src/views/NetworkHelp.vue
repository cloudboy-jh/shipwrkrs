<template>
  <div class="page-top">
    <div class="page-content">
      <div class="hero">
        <h1>Network <em>help</em></h1>
        <p>Turnstile requires access to challenges.cloudflare.com.</p>
      </div>

      <article class="prompt-block section">
        <h2>Fix in under 2 minutes</h2>
        <ol>
          <li>Allowlist <code>challenges.cloudflare.com</code> in your DNS filter.</li>
          <li>Reload <code>/api/auth/login</code>.</li>
          <li>Sign in again.</li>
        </ol>
      </article>

      <article class="prompt-block section">
        <h2>Pi-hole</h2>
        <p>Web UI: <code>Domains</code> -> <code>Allow</code> -> <code>challenges.cloudflare.com</code>.</p>
        <p>CLI:</p>
        <pre>pihole -w challenges.cloudflare.com</pre>
      </article>

      <article class="prompt-block section">
        <h2>AdGuard Home</h2>
        <p>Add this user rule:</p>
        <pre>@@||challenges.cloudflare.com^</pre>
      </article>

      <article class="prompt-block section">
        <h2>NextDNS / corporate filters</h2>
        <p>Allowlist the same host in your profile policy. If managed by IT, ask your admin to unblock it.</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page-content {
  width: 100%;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero {
  text-align: center;
  margin-bottom: 4px;
}

.hero h1 {
  font-family: var(--sans);
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hero h1 em {
  font-style: normal;
  color: var(--o);
}

.hero p {
  margin-top: 8px;
  color: var(--tm);
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
}

.section {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section h2 {
  font-size: 18px;
  font-weight: 700;
}

.section p,
.section li {
  color: var(--t2);
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
}

ol {
  margin-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

pre,
code {
  font-family: var(--mono);
}

pre {
  background: var(--el);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 10px;
  overflow: auto;
  color: var(--tx);
  font-size: 12px;
  font-weight: 600;
}

code {
  color: var(--tx);
}
</style>
