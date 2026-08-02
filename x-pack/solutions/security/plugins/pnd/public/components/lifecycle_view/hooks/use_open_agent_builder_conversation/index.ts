/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/**
 * The Agent Builder app id, as registered by the `agent_builder` plugin.
 *
 * Declared here rather than imported from `@kbn/deeplinks-agent-builder` because that package is not
 * in `pnd/tsconfig.json`'s `kbn_references`, and that file belongs to another group in this wave.
 * `use_workflows_deep_link` already sets this precedent with `WORKFLOWS_APP_ID`. Swapping in the
 * package constant is a one-line follow-up once the reference is added.
 */
export const AGENT_BUILDER_APP_ID = 'agent_builder';

/**
 * Opens a PND conversation in Agent Builder in a new tab.
 *
 * `navigateToApp` rather than a hand-built href, so the `/s/<space>` prefix is applied for us; a new
 * tab, so the lifecycle the analyst opened this from stays mounted behind it.
 */
export const useOpenAgentBuilderConversation = (): ((conversationId: string) => void) => {
  const { services } = useKibana<{ application?: ApplicationStart }>();
  const { application } = services;

  return useCallback(
    (conversationId: string) => {
      application?.navigateToApp(AGENT_BUILDER_APP_ID, {
        openInNewTab: true,
        path: `/conversations/${conversationId}`,
      });
    },
    [application]
  );
};
