/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_SESSION_REPLAY_SETTINGS,
  sdkReplayFromSettings,
  sdkSessionFromSettings,
} from './session_replay_settings';

/** Same-origin plugin asset for the vendored EDOT replay IIFE. */
export const SESSION_REPLAY_VENDOR_BUNDLE_PATH =
  '/plugins/ux/assets/elastic_otel_browser_replay.min.js';

/** Filename served by the collector tunnel next to OTLP `/v1/*`. */
export const SESSION_REPLAY_SDK_SCRIPT_FILE = 'elastic-otel-browser-replay.min.js';

export interface SessionReplayInjectSnippetParams {
  agentSource: string;
  otlpEndpoint: string;
  serviceName: string;
  ignoreUrls?: string[];
  urlGroupingDepth?: number;
  urlGroupingRules?: string[];
  maskTextSelector?: string;
  maskAllInputs?: boolean;
  maskAllText?: boolean;
  recordCanvas?: boolean;
  sessionMaxMs?: number;
  sessionIdleMs?: number;
  captureGraphql?: boolean;
  sampleRate?: number;
}

export const sessionReplaySdkScriptUrl = (otlpEndpoint: string): string => {
  const base = otlpEndpoint.trim().replace(/\/+$/, '');
  return base.length === 0 ? '' : `${base}/${SESSION_REPLAY_SDK_SCRIPT_FILE}`;
};

const injectConfig = ({
  otlpEndpoint,
  serviceName,
  ignoreUrls = [],
  urlGroupingDepth,
  urlGroupingRules = [],
  maskTextSelector,
  maskAllInputs,
  maskAllText,
  recordCanvas,
  sessionMaxMs,
  sessionIdleMs,
  captureGraphql,
  sampleRate,
  persistent = false,
}: Omit<SessionReplayInjectSnippetParams, 'agentSource'> & { persistent?: boolean }) => {
  const capture: Record<string, unknown> = {};
  if (ignoreUrls.length) {
    capture.ignoreUrls = ignoreUrls;
  }
  const urlGrouping: Record<string, unknown> = {};
  if (urlGroupingDepth) {
    urlGrouping.depth = urlGroupingDepth;
  }
  if (urlGroupingRules.length) {
    urlGrouping.rules = urlGroupingRules;
  }
  if (Object.keys(urlGrouping).length) {
    capture.urlGrouping = urlGrouping;
  }
  if (captureGraphql) {
    capture.graphql = true;
  }
  const replaySettings = {
    ...DEFAULT_SESSION_REPLAY_SETTINGS,
    sampleRate: sampleRate ?? DEFAULT_SESSION_REPLAY_SETTINGS.sampleRate,
    maskTextSelector: maskTextSelector ?? '',
    maskAllInputs: maskAllInputs ?? DEFAULT_SESSION_REPLAY_SETTINGS.maskAllInputs,
    maskAllText: maskAllText ?? DEFAULT_SESSION_REPLAY_SETTINGS.maskAllText,
    recordCanvas: recordCanvas ?? DEFAULT_SESSION_REPLAY_SETTINGS.recordCanvas,
    sessionMaxMs: sessionMaxMs ?? DEFAULT_SESSION_REPLAY_SETTINGS.sessionMaxMs,
    sessionIdleMs: sessionIdleMs ?? DEFAULT_SESSION_REPLAY_SETTINGS.sessionIdleMs,
  };
  return {
    serviceName,
    otlpEndpoint,
    ...(persistent
      ? {}
      : {
          resourceAttributes: {
            'deployment.environment': 'devtools-inject',
          },
        }),
    ...(Object.keys(capture).length ? { capture } : {}),
    session: sdkSessionFromSettings(replaySettings, persistent),
    replay: sdkReplayFromSettings(replaySettings),
  };
};

/** Short preview for the flyout; Copy uses {@link buildSessionReplayInjectSnippet}. */
export const buildSessionReplayInjectPreview = ({
  otlpEndpoint,
  serviceName,
  ignoreUrls,
  urlGroupingDepth,
  urlGroupingRules,
  maskTextSelector,
  maskAllInputs,
  maskAllText,
  recordCanvas,
  sessionMaxMs,
  sessionIdleMs,
  captureGraphql,
  sampleRate,
}: Omit<SessionReplayInjectSnippetParams, 'agentSource'>): string => {
  const cfg = injectConfig({
    otlpEndpoint,
    serviceName,
    ignoreUrls,
    urlGroupingDepth,
    urlGroupingRules,
    maskTextSelector,
    maskAllInputs,
    maskAllText,
    recordCanvas,
    sessionMaxMs,
    sessionIdleMs,
    captureGraphql,
    sampleRate,
  });
  return `(() => {
  const CFG = ${JSON.stringify(cfg, null, 2)};
  // Agent source is inlined when you click Copy (~270 KB).
  // Paste the copied snippet into the DevTools console — do not load a remote <script>.
  window.edotBrowser = startBrowserSdk(CFG);
})();`;
};

/** Page install: load the collector IIFE, then start the SDK. */
export const buildSessionReplaySdkHtmlSnippet = (
  params: Omit<SessionReplayInjectSnippetParams, 'agentSource'>
): string => {
  const scriptUrl = sessionReplaySdkScriptUrl(params.otlpEndpoint);
  const cfg = injectConfig({ ...params, persistent: true });
  return `<script src="${scriptUrl}"></script>
<script>
  window.edotBrowser = startBrowserSdk(${JSON.stringify(cfg, null, 2)});
</script>`;
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
  ignoreUrls,
  urlGroupingDepth,
  urlGroupingRules,
  maskTextSelector,
  maskAllInputs,
  maskAllText,
  recordCanvas,
  sessionMaxMs,
  sessionIdleMs,
  captureGraphql,
  sampleRate,
}: SessionReplayInjectSnippetParams): string => {
  const cfg = injectConfig({
    otlpEndpoint,
    serviceName,
    ignoreUrls,
    urlGroupingDepth,
    urlGroupingRules,
    maskTextSelector,
    maskAllInputs,
    maskAllText,
    recordCanvas,
    sessionMaxMs,
    sessionIdleMs,
    captureGraphql,
    sampleRate,
  });

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
