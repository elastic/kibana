/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Logger, OnSetup, PluginSetup, PluginStart } from '@kbn/core-di';
import type { NightshiftSourcesServerSetup } from '@kbn/nightshift-sources-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { createRulesStaleNotifier } from '../lib/rules/rules_stale_notifier';

/**
 * Marks a space's detection rules out of date whenever its sources change, which starts the space's
 * rule reconcile workflow. Knowledge indicator changes start that workflow through the
 * `significant-events.knowledgeIndicatorsChanged` trigger instead.
 */
export function bindChangeListeners({ bind }: ContainerModuleLoadOptions): void {
  bind(OnSetup).toConstantValue((container) => {
    const nightshiftSources = container.get(
      PluginSetup<NightshiftSourcesServerSetup>('nightshiftSources')
    );
    const notify = createRulesStaleNotifier({
      // Read on the first change, which only happens once every plugin has started.
      getWorkflowsClient: (request) =>
        container
          .get(PluginStart<WorkflowsExtensionsServerPluginStart>('workflowsExtensions'))
          .getClient(request),
      logger: container.get(Logger).get('rules-stale'),
    });

    nightshiftSources.onSourceChange(async ({ request, source }) => {
      notify({ request, event: { source_ids: [source.id] } });
    });
  });
}
