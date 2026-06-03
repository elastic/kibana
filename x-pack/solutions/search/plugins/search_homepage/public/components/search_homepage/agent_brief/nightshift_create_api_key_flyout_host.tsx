/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import {
  KibanaRenderContextProvider,
  type KibanaRenderContextProviderProps,
} from '@kbn/react-kibana-context-render';
import type { CreateAPIKeyResult } from '@kbn/security-api-key-management';
import { ApiKeyFlyout } from '@kbn/security-api-key-management';

import {
  closeCreateApiKeyFlyout,
  createApiKeyFlyoutTarget$,
  type CreateApiKeyFlyoutTarget,
} from './nightshift_created_api_keys_store';
import { recordCreatedApiKey } from './nightshift_created_api_keys_store';

/* ----------------------------------------------------------------------- *
 * Global "Create API key" flyout host.
 *
 * The attachment definition skips `renderInlineContent` so the framework
 * draws the Figma single-row card (header-only). That means the Open
 * flyout action handler has nowhere to mount the platform-shared
 * `ApiKeyFlyout` from — so the searchHomepage plugin mounts this host
 * once on `start`, into a dedicated portal-root appended to
 * `document.body`. The host subscribes to `createApiKeyFlyoutTarget$`
 * and renders the flyout whenever a target is set; on success it
 * records the created key into the per-attachment store and closes.
 *
 * Wrapped in `KibanaRenderContextProvider` + `KibanaContextProvider`
 * so the flyout's internal `useKibana()` (from the legacy
 * `@kbn/kibana-react-plugin/public`) and EUI theming both resolve
 * against the same `CoreStart` instance the rest of the host UI uses.
 * ----------------------------------------------------------------------- */

interface CreateApiKeyFlyoutHostProps {
  core: CoreStart;
}

const CreateApiKeyFlyoutHost: React.FC<CreateApiKeyFlyoutHostProps> = ({ core }) => {
  const [target, setTarget] = useState<CreateApiKeyFlyoutTarget | null>(() =>
    createApiKeyFlyoutTarget$.getValue()
  );

  useEffect(() => {
    const subscription = createApiKeyFlyoutTarget$.subscribe(setTarget);
    return () => subscription.unsubscribe();
  }, []);

  const onCancel = useCallback(() => {
    closeCreateApiKeyFlyout();
  }, []);

  const onSuccess = useCallback((response: CreateAPIKeyResult) => {
    const current = createApiKeyFlyoutTarget$.getValue();
    if (current) {
      recordCreatedApiKey(current.attachmentId, response);
    }
    closeCreateApiKeyFlyout();
  }, []);

  if (!target) return null;

  const renderContext: KibanaRenderContextProviderProps = {
    analytics: core.analytics,
    executionContext: core.executionContext,
    i18n: core.i18n,
    theme: core.theme,
    userProfile: core.userProfile,
  };

  return (
    <KibanaRenderContextProvider {...renderContext}>
      <I18nProvider>
        <KibanaContextProvider services={core}>
          <ApiKeyFlyout
            onSuccess={onSuccess}
            onCancel={onCancel}
            defaultName={target.defaultName}
            /*
             * Push mode: don't show a modal backdrop or trap focus —
             * the conversation surface stays interactive while the
             * user fills in the form, matching the rest of the
             * Nightshift agent-brief flyouts (e.g. the per-row API
             * key details flyout in `nightshift_expiring_keys_summary`).
             */
            flyoutType="push"
          />
        </KibanaContextProvider>
      </I18nProvider>
    </KibanaRenderContextProvider>
  );
};

/**
 * Mount the global flyout host into a dedicated `<div>` appended to
 * `document.body`. Idempotent: re-calling no-ops if already mounted.
 */
const HOST_ROOT_ID = 'nightshiftCreateApiKeyFlyoutHostRoot';
let unmounted = false;

export const mountCreateApiKeyFlyoutHost = (core: CoreStart): void => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(HOST_ROOT_ID)) return;

  const root = document.createElement('div');
  root.id = HOST_ROOT_ID;
  document.body.appendChild(root);
  unmounted = false;
  ReactDOM.render(<CreateApiKeyFlyoutHost core={core} />, root);
};

/**
 * Tear down the host. Used by tests / HMR — the plugin's `stop` path
 * calls this. Idempotent.
 */
export const unmountCreateApiKeyFlyoutHost = (): void => {
  if (typeof document === 'undefined' || unmounted) return;
  const root = document.getElementById(HOST_ROOT_ID);
  if (!root) return;
  ReactDOM.unmountComponentAtNode(root);
  root.remove();
  unmounted = true;
};
