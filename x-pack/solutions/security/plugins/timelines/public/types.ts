/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { ApmBase } from '@elastic/apm-rum';

/**
 * The timelines plugin no longer exposes a browser-side start contract; its former
 * consumers now import the add-to-timeline helpers directly. This empty contract is
 * retained until the plugin is fully removed.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TimelinesUIStart {}

export interface TimelinesStartPlugins {
  data: DataPublicPluginStart;
  cases: CasesPublicStart;
  apm?: ApmBase;
}

export type TimelinesStartServices = CoreStart & TimelinesStartPlugins;
