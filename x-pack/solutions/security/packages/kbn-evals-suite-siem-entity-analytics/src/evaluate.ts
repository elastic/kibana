/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base, createDefaultTerminalReporter } from '@kbn/evals';
import { SiemEntityAnalyticsEvaluationChatClient } from './chat_client';

export const evaluate = base.extend<
  {},
  {
    chatClient: SiemEntityAnalyticsEvaluationChatClient;
    siemSetup: void;
  }
>({
  siemSetup: [
    async ({ fetch, log }, use) => {
      // Ensure Agent Builder API is enabled before running the evaluation
      const currentSettings = (await fetch('/internal/kibana/settings')) as {
        settings: Record<string, { userValue?: unknown }>;
      };
      const isAgentBuilderEnabled =
        currentSettings?.settings?.['agentBuilder:enabled']?.userValue === true;

      if (isAgentBuilderEnabled) {
        log.debug('Agent Builder is already enabled');
      } else {
        await fetch('/internal/kibana/settings', {
          method: 'POST',
          body: JSON.stringify({
            changes: {
              'agentBuilder:enabled': true,
            },
          }),
        });
        log.debug('Agent Builder enabled for the evaluation');
      }

      await use();
    },
    {
      scope: 'worker',
      auto: true, // This ensures it runs automatically
    },
  ],
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      const chatClient = new SiemEntityAnalyticsEvaluationChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
  reportModelScore: [
    async (_, use) => {
      await use(createDefaultTerminalReporter());
    },
    { scope: 'worker' },
  ],
});
