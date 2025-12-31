'use client';

import { useEffect, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Divider, Input } from '@heroui/react';

type User = {
  discordId: string;
  username: string;
  avatar?: string | null;
  license?: string | null;
  steam?: string | null;
  rockstar?: string | null;
};

type ConnectInfo = {
  host: string;
  port: number;
  expiresIn: number;
  connectToken: string;
};

export default function ConsolePage() {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [connectInfo, setConnectInfo] = useState<ConnectInfo | null>(null);
  const [identifiers, setIdentifiers] = useState({ license: '', steam: '', rockstar: '' });

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${apiBase}/api/me`, { credentials: 'include' });
      if (!res.ok) {
        window.location.href = '/';
        return;
      }
      const data = (await res.json()) as User;
      setUser(data);
      setIdentifiers({
        license: data.license || '',
        steam: data.steam || '',
        rockstar: data.rockstar || ''
      });

      const csrfRes = await fetch(`${apiBase}/api/csrf`, { credentials: 'include' });
      if (csrfRes.ok) {
        const csrfData = (await csrfRes.json()) as { csrfToken: string };
        setCsrfToken(csrfData.csrfToken);
      }
    };

    load().catch((err) => setError(err.message));
  }, [apiBase]);

  const saveIdentifiers = async () => {
    setError(null);
    setMessage(null);
    if (!csrfToken) {
      setError('csrf_missing');
      return;
    }
    const res = await fetch(`${apiBase}/api/identifiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      credentials: 'include',
      body: JSON.stringify(identifiers)
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error || 'save_failed');
      return;
    }

    setMessage('Identifiers updated');
  };

  const connect = async () => {
    setError(null);
    setMessage(null);
    setConnectInfo(null);
    if (!csrfToken) {
      setError('csrf_missing');
      return;
    }

    const res = await fetch(`${apiBase}/api/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      credentials: 'include'
    });

    const body = (await res.json().catch(() => ({}))) as Partial<ConnectInfo> & { error?: string };
    if (!res.ok) {
      setError(body.error || 'connect_failed');
      return;
    }

    setConnectInfo(body as ConnectInfo);
  };

  if (!user) {
    return (
      <main className="container">
        <p className="muted">Loading...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="header">
        <div>
          <p className="eyebrow">Authorized</p>
          <h1>Access Console</h1>
          <p className="muted">Discord: {user.username}</p>
        </div>
      </div>

      <div className="stack">
        <Card className="panel">
          <CardHeader>
            <div>
              <h2>Identifiers</h2>
              <p className="muted">Bind your access token to stable IDs.</p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="stack">
            <Input
              label="License"
              value={identifiers.license}
              onValueChange={(value) => setIdentifiers({ ...identifiers, license: value })}
              placeholder="license:xxxxxxxx"
            />
            <Input
              label="Steam"
              value={identifiers.steam}
              onValueChange={(value) => setIdentifiers({ ...identifiers, steam: value })}
              placeholder="steam:xxxxxxxx"
            />
            <Input
              label="Rockstar"
              value={identifiers.rockstar}
              onValueChange={(value) => setIdentifiers({ ...identifiers, rockstar: value })}
              placeholder="rockstar:xxxxxxxx"
            />
            <div className="actions">
              <Button color="primary" onPress={saveIdentifiers}>
                Save
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="panel">
          <CardHeader>
            <div>
              <h2>Connect</h2>
              <p className="muted">Access expires in seconds. No re-use.</p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="stack">
            <Button color="primary" onPress={connect}>
              Generate Connect Access
            </Button>
            {connectInfo && (
              <div className="result">
                <p>Host: {connectInfo.host}</p>
                <p>Port: {connectInfo.port}</p>
                <p>Expires: {connectInfo.expiresIn}s</p>
                <p className="token">Token: {connectInfo.connectToken}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {error && <p className="status error">Error: {error}</p>}
        {message && <p className="status ok">{message}</p>}
      </div>
    </main>
  );
}
