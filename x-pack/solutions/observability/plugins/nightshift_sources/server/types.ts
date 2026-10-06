/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SourceChangeListener } from './lib/source_change_emitter';
import type { SourcesClient } from './lib/sources_client';

export type GetSourcesClient = (params: { request: KibanaRequest }) => Promise<SourcesClient>;

export interface NightshiftSourcesServerSetup {
  /**
   * Subscribes to every committed create, update (including enable/disable) and delete, from
   * the HTTP routes and from `getSourcesClient()` alike. The write awaits every listener before
   * it returns, so a listener's side effects are visible to the caller. A listener that throws
   * is logged and cannot undo the write. Returns the unsubscribe function.
   */
  onSourceChange: (listener: SourceChangeListener) => () => void;
}

export interface NightshiftSourcesServerStart {
  /**
   * Same client the HTTP routes use. The saved-objects security extension authorizes each call
   * against the Nightshift feature (`all` can write `nightshift-source`, `read` can read it)
   * and emits the audit event. `configure_nightshift` cannot use it.
   */
  getSourcesClient: GetSourcesClient;
}
