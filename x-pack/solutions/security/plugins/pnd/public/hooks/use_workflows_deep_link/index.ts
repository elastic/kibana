/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/** The Workflows management app id, as registered by `workflows_management`. */
export const WORKFLOWS_APP_ID = 'workflows';

export interface UseWorkflowsDeepLink {
  /** Opens the deep link in a new tab. A no-op when there is no link to open. */
  navigate: () => void;
  /** Absolute URL for an `href`, or `null` when there is nothing to link to. */
  url: string | null;
}

/**
 * Turns a Workflows-app-relative `deepLinkPath` — the shape PND's `runs` and
 * `executions` projections return, e.g.
 * `/{workflowId}?tab=executions&executionId={runId}&stepExecutionId={stepId}` —
 * into an href plus a new-tab navigation callback.
 *
 * Both `getUrlForApp` and `navigateToApp` apply the `/s/<space>` prefix, so a
 * caller must never hand-build `/app/workflows${deepLinkPath}`.
 *
 * `getUrlForApp` **throws** when the Workflows app is not registered (a Kibana
 * without `workflowsManagement`), so it is wrapped: the hook degrades to a null
 * url instead of taking the page down with it.
 */
export const useWorkflowsDeepLink = (
  deepLinkPath: string | null | undefined
): UseWorkflowsDeepLink => {
  const { services } = useKibana<{ application?: ApplicationStart }>();
  const { application } = services;

  const url = useMemo(() => {
    if (!deepLinkPath || application == null) {
      return null;
    }

    try {
      return application.getUrlForApp(WORKFLOWS_APP_ID, { path: deepLinkPath });
    } catch {
      // the Workflows app is not registered on this Kibana
      return null;
    }
  }, [application, deepLinkPath]);

  const navigate = useCallback(() => {
    // `url` is only non-null when the app resolved, so this cannot navigate nowhere
    if (!deepLinkPath || application == null || url == null) {
      return;
    }

    application.navigateToApp(WORKFLOWS_APP_ID, { openInNewTab: true, path: deepLinkPath });
  }, [application, deepLinkPath, url]);

  return { navigate, url };
};
