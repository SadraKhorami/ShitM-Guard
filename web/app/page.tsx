'use client';

import { Button, Card, CardBody, CardHeader } from '@heroui/react';

export default function HomePage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? '';
  const loginUrl = apiBase ? `${apiBase}/auth/discord` : '';

  const handleLogin = () => {
    if (!loginUrl) return;
    window.location.href = loginUrl;
  };

  return (
    <main className="container">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ShitM Guard</p>
          <h1>FiveM Access Console</h1>
          <p className="muted">
            Short-lived connect access, strict identifiers, and entry allowlist gating.
          </p>
        </div>
        <Card className="panel">
          <CardHeader>
            <div>
              <h2>Authorize & Connect</h2>
              <p className="muted">Discord auth is mandatory before issuing access.</p>
            </div>
          </CardHeader>
          <CardBody className="stack">
            <Button color="primary" size="lg" onPress={handleLogin} isDisabled={!loginUrl}>
              Login with Discord
            </Button>
            <p className="muted small">
              Tokens expire fast. Entry IP is always visible and still gated.
            </p>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
