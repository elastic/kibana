/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { fetchSessionReplaySettings } from '../services/rest/session_replay_api';

interface EdotBrowserHandle {
  sessionId?: string;
  forceFlush?: () => Promise<void>;
}

type StartBrowserSdk = (cfg: Record<string, unknown>) => EdotBrowserHandle;

interface EdotWindow extends Window {
  __edotStarted?: boolean;
  startBrowserSdk?: StartBrowserSdk;
  edotBrowser?: EdotBrowserHandle;
}

// Vendored EDOT browser SDK IIFE, served as a plugin static asset. Loading it as
// a same-origin <script src> keeps it CSP-safe (no inline eval) and out of the
// TypeScript program / webpack graph.
const VENDOR_BUNDLE_PATH = '/plugins/ux/assets/elastic_otel_browser_replay.min.js';

const loadVendorBundle = (core: CoreStart): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof (window as EdotWindow).startBrowserSdk === 'function') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = core.http.basePath.prepend(VENDOR_BUNDLE_PATH);
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load EDOT replay bundle'));
    document.head.appendChild(script);
  });

const getCurrentUserSafe = async (
  core: CoreStart
): Promise<{ username?: string; email?: string } | undefined> => {
  try {
    return await core.security?.authc?.getCurrentUser();
  } catch {
    return undefined;
  }
};

/**
 * Load the vendored EDOT browser SDK and start Session Replay for the current
 * Kibana page, using the runtime settings saved object (managed from the UX
 * settings page). Idempotent within a page and best-effort: any failure is
 * swallowed so it can never break Kibana itself.
 */
export const startSessionReplay = async (core: CoreStart): Promise<void> => {
  const edotWindow = window as EdotWindow;
  if (edotWindow.__edotStarted) {
    return;
  }

  const settings = await fetchSessionReplaySettings({ http: core.http }).catch(() => undefined);
  if (!settings?.enabled || !settings.otlpEndpoint) {
    return;
  }

  try {
    await loadVendorBundle(core);
    if (typeof edotWindow.startBrowserSdk !== 'function') {
      return;
    }

    const user = await getCurrentUserSafe(core);
    edotWindow.__edotStarted = true;
    edotWindow.edotBrowser = edotWindow.startBrowserSdk({
      serviceName: settings.serviceName,
      otlpEndpoint: settings.otlpEndpoint,
      resourceAttributes: {
        'deployment.environment': 'kibana',
        ...(user?.username ? { 'user.name': user.username } : {}),
        ...(user?.email ? { 'user.email': user.email } : {}),
      },
      replay: {
        enabled: true,
        samplingRate: settings.sampleRate,
        errorSamplingRate: 100,
      },
    });
  } catch {
    // Best-effort: replay must never break Kibana. Reset the guard so a later
    // navigation can retry loading the SDK.
    edotWindow.__edotStarted = false;
  }
};
