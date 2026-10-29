/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { remotable } from '@kbn/core-remote-common';
import type { ScopeLookup } from '@kbn/core-remote-server';
import type { EsSearchClient } from '../workflows/step_types/build_alert_entity_graph_step/types';
import { ScopedAlertGraphSearch } from './scoped_alert_graph_search';

/**
 * Coordinator-side search. The worker asks for a scope; this class binds the existing
 * scoped Elasticsearch client and returns parsed hits.
 */
@remotable()
export class AlertGraphEs {
  constructor(
    private readonly scopes: ScopeLookup,
    private readonly getScopedClient: (request: KibanaRequest) => Promise<ElasticsearchClient>
  ) {}

  async forScope(scopeId: string): Promise<EsSearchClient> {
    const request = this.scopes.get<KibanaRequest>(scopeId);
    return new ScopedAlertGraphSearch(await this.getScopedClient(request));
  }
}
