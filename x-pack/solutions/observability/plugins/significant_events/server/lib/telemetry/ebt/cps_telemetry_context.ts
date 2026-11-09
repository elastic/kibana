/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

export type TargetClusterScope = 'origin' | 'all';

export interface EbtTelemetryContext {
  space_id: string;
  target_cluster_scope?: TargetClusterScope;
  target_cluster_ids?: string[];
  target_cluster_ids_complete?: boolean;
}

export interface CpsTelemetryContextConfig {
  cpsEnabled: boolean;
  originProjectId?: string;
  getLinkedProjectIds: (request: KibanaRequest) => Promise<string[] | undefined>;
}

export type EbtTelemetryContextResult = EbtTelemetryContext | Promise<EbtTelemetryContext>;

export class CpsTelemetryContextProvider {
  private readonly linkedProjectIds = new WeakMap<KibanaRequest, Promise<string[] | undefined>>();

  constructor(private readonly config: CpsTelemetryContextConfig) {}

  public get(
    request: KibanaRequest,
    targetClusterScope: TargetClusterScope
  ): EbtTelemetryContextResult {
    const spaceId = request.spaceId;

    if (!this.config.cpsEnabled) {
      return { space_id: spaceId };
    }

    const originIds = this.config.originProjectId ? [this.config.originProjectId] : [];

    if (targetClusterScope === 'origin') {
      return {
        space_id: spaceId,
        target_cluster_scope: targetClusterScope,
        target_cluster_ids: originIds,
        target_cluster_ids_complete: originIds.length === 1,
      };
    }

    let linkedIds = this.linkedProjectIds.get(request);
    if (!linkedIds) {
      linkedIds = this.config.getLinkedProjectIds(request).catch(() => undefined);
      this.linkedProjectIds.set(request, linkedIds);
    }

    return linkedIds.then((resolvedLinkedIds) => ({
      space_id: spaceId,
      target_cluster_scope: targetClusterScope,
      target_cluster_ids: Array.from(new Set([...originIds, ...(resolvedLinkedIds ?? [])])),
      target_cluster_ids_complete: originIds.length === 1 && resolvedLinkedIds !== undefined,
    }));
  }
}
