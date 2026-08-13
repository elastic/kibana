/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Same-origin plugin asset for the vendored EDOT replay IIFE. */
export const SESSION_REPLAY_VENDOR_BUNDLE_PATH =
  '/plugins/ux/assets/elastic_otel_browser_replay.min.js';

export interface SessionReplayInjectSnippetParams {
  agentSource: string;
  otlpEndpoint: string;
  serviceName: string;
}

const injectConfig = (otlpEndpoint: string, serviceName: string) => ({
  serviceName,
  otlpEndpoint,
  resourceAttributes: {
    'deployment.environment': 'devtools-inject',
  },
  replay: {
    enabled: true,
    samplingRate: 100,
    errorSamplingRate: 100,
  },
});

/** Short preview for the flyout; Copy uses {@link buildSessionReplayInjectSnippet}. */
export const buildSessionReplayInjectPreview = ({
  otlpEndpoint,
  serviceName,
}: Omit<SessionReplayInjectSnippetParams, 'agentSource'>): string => {
  const cfg = injectConfig(otlpEndpoint, serviceName);
  return `(() => {
  const CFG = ${JSON.stringify(cfg, null, 2)};
  // Agent source is inlined when you click Copy (~270 KB).
  // Paste the copied snippet into the DevTools console — do not load a remote <script>.
  window.edotBrowser = startBrowserSdk(CFG);
})();`;
};

/**
 * DevTools console snippet with the agent IIFE inlined.
 * Console-pasted code is not subject to the page script-src, unlike fetch+eval
 * or a remote <script src>.
 */
export const buildSessionReplayInjectSnippet = ({
  agentSource,
  otlpEndpoint,
  serviceName,
}: SessionReplayInjectSnippetParams): string => {
  const cfg = injectConfig(otlpEndpoint, serviceName);

  return `(() => {
  const CFG = ${JSON.stringify(cfg)};
  const w = window;
  if (w.__edotStarted) {
    console.warn('Session replay already running');
    return;
  }
${agentSource}
  if (typeof w.startBrowserSdk !== 'function') {
    console.error('Session replay SDK did not load');
    return;
  }
  w.__edotStarted = true;
  w.edotBrowser = w.startBrowserSdk(CFG);
  console.log('Session replay started', w.edotBrowser && w.edotBrowser.sessionId);
})();`;
};
