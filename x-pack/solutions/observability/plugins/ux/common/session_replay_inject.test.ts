/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSessionReplayInjectPreview,
  buildSessionReplayInjectSnippet,
  buildSessionReplaySdkHtmlSnippet,
  sessionReplaySdkScriptUrl,
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

describe('sessionReplaySdkScriptUrl', () => {
  it('joins the collector host and IIFE filename', () => {
    expect(sessionReplaySdkScriptUrl('https://abc.trycloudflare.com')).toBe(
      'https://abc.trycloudflare.com/elastic-otel-browser-replay.min.js'
    );
    expect(sessionReplaySdkScriptUrl('https://abc.trycloudflare.com/')).toBe(
      'https://abc.trycloudflare.com/elastic-otel-browser-replay.min.js'
    );
    expect(sessionReplaySdkScriptUrl('')).toBe('');
  });
});

describe('buildSessionReplaySdkHtmlSnippet', () => {
  it('loads the collector IIFE then starts the SDK', () => {
    const html = buildSessionReplaySdkHtmlSnippet({
      otlpEndpoint: 'https://abc.trycloudflare.com',
      serviceName: 'colleague-app',
    });

    expect(html).toContain(
      'src="https://abc.trycloudflare.com/elastic-otel-browser-replay.min.js"'
    );
    expect(html).toContain('window.edotBrowser = startBrowserSdk(');
    expect(html).toContain('colleague-app');
    expect(html).toContain('"recordCanvas": true');
    expect(html).toContain('"maskAllInputs": true');
    expect(html).not.toContain('"maskTextSelector"');
    expect(html).toContain('"maxMs": 14400000');
    expect(html).toContain('"idleMs": 1800000');
    expect(html).toContain('"persistSession": true');
    expect(html).not.toContain('devtools-inject');
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
    expect(preview).toContain('"recordCanvas": true');
    expect(preview).toContain('"persistSession": false');
    expect(preview).not.toContain(FAKE_AGENT);
  });
});
