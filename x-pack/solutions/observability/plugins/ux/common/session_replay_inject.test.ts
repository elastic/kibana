/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSessionReplayInjectPreview,
  buildSessionReplayInjectSnippet,
} from './session_replay_inject';

const FAKE_AGENT = 'globalThis.startBrowserSdk=function(cfg){return {sessionId:"x",cfg};};';

describe('buildSessionReplayInjectSnippet', () => {
  it('inlines the agent and does not fetch or eval a remote script', () => {
    const snippet = buildSessionReplayInjectSnippet({
      agentSource: FAKE_AGENT,
      otlpEndpoint: 'https://abc.trycloudflare.com',
      serviceName: 'colleague-app',
    });

    expect(snippet).toContain(FAKE_AGENT);
    expect(snippet).toContain('https://abc.trycloudflare.com');
    expect(snippet).toContain('colleague-app');
    expect(snippet).toContain('w.startBrowserSdk(CFG)');
    expect(snippet).not.toContain('fetch(');
    expect(snippet).not.toContain('eval(');
    expect(snippet).not.toContain('<script');
    expect(snippet).not.toContain('elastic-otel-browser-replay.min.js');
  });

  it('escapes quotes in user-provided values', () => {
    const snippet = buildSessionReplayInjectSnippet({
      agentSource: FAKE_AGENT,
      otlpEndpoint: 'https://otlp.test/"break',
      serviceName: "svc'name",
    });

    expect(snippet).toContain(JSON.stringify('https://otlp.test/"break'));
    expect(snippet).toContain(JSON.stringify("svc'name"));
  });
});

describe('buildSessionReplayInjectPreview', () => {
  it('shows config without the agent body', () => {
    const preview = buildSessionReplayInjectPreview({
      otlpEndpoint: 'https://abc.trycloudflare.com',
      serviceName: 'colleague-app',
    });

    expect(preview).toContain('colleague-app');
    expect(preview).toContain('https://abc.trycloudflare.com');
    expect(preview).not.toContain(FAKE_AGENT);
  });
});
