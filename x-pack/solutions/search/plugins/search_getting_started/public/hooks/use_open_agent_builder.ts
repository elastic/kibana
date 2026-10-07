/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { useKibana } from './use_kibana';

export const useOpenAgentBuilder = () => {
  const {
    services: { application },
  } = useKibana();

  const openAgentBuilder = useCallback(
    (initialMessage: string = '', source: string = 'search_getting_started') => {
      application.navigateToApp(AGENT_BUILDER_APP_ID, {
        path: `/agents/${agentBuilderDefaultAgentId}/conversations/new`,
        state: {
          initialMessage,
          entryPointSource: source,
        },
      });
    },
    [application]
  );
  return openAgentBuilder;
};
