/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  Logger,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import { createSourceChangeEmitter, type SourceChangeEmitter } from '../lib/source_change_emitter';
import { createSourcesClient } from '../runtime';
import { nightshiftSourceSavedObjectType } from '../saved_objects/nightshift_source_saved_object';
import type { NightshiftSourcesServerSetup, NightshiftSourcesServerStart } from '../types';
import { nightshiftSourcesBridge } from './bridge';

/**
 * The sources catalog for a task pod: the saved object type and the scoped sources client, built by
 * the same code as the plugin's `server` entry (no routes). In Kibana this entry hands out the
 * plugin's own contracts (see `bridge.ts`). Source changes made in a pod are emitted to listeners
 * of that pod only.
 */
class NightshiftSourcesTasksPlugin
  implements TasksPlugin<NightshiftSourcesServerSetup, NightshiftSourcesServerStart>
{
  private readonly logger: Logger;
  private readonly sourceChangeEmitter: SourceChangeEmitter;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.sourceChangeEmitter = createSourceChangeEmitter(this.logger.get('source-changes'));
  }

  setup(core: CoreTasksSetup): NightshiftSourcesServerSetup {
    const real = nightshiftSourcesBridge.getSetup();
    if (real) return real;

    core.savedObjects.registerType(nightshiftSourceSavedObjectType);
    return { onSourceChange: this.sourceChangeEmitter.subscribe };
  }

  start(core: CoreTasksStart): NightshiftSourcesServerStart {
    const real = nightshiftSourcesBridge.getStart();
    if (real) return real;

    return {
      getSourcesClient: async ({ request }) =>
        createSourcesClient(core, request, this.logger.get('sources'), this.sourceChangeEmitter),
    };
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new NightshiftSourcesTasksPlugin(context);
