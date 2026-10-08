/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import type { EntityStoreStartContract } from '@kbn/entity-store/server';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type {
  BriefSnapshot,
  BriefTimeRange,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type { EvidenceRegistry } from './evidence_registry';

/** Everything a snapshot part needs. Built once per job by lane 5 (job runner). */
export interface SnapshotContext {
  spaceId: string;
  timeRange: BriefTimeRange;
  /** User-scoped: the brief must never show data the user cannot read. */
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  logger: Logger;
  abortSignal: AbortSignal;
  registry: EvidenceRegistry;
  services: {
    rulesClient?: RulesClient;
    casesClient?: CasesClient;
    ml?: MlPluginSetup;
    entityStore?: EntityStoreStartContract;
    fleetPackageService?: PackageService;
  };
}

export type SnapshotSources = BriefSnapshot['sources'];

/** Result shape of each snapshot part (glance, storylines, blind spots). */
export interface SnapshotPart<T> {
  value: T;
  sources: SnapshotSources;
}

/** Runs one source with timing; a failure becomes a source status, never a thrown error. */
export const runSource = async <T>(
  name: string,
  sources: SnapshotSources,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> => {
  const start = Date.now();
  try {
    const value = await fn();
    sources[name] = { status: 'ok', tookMs: Date.now() - start };
    return value;
  } catch (error) {
    sources[name] = {
      status: 'error',
      tookMs: Date.now() - start,
      message: error instanceof Error ? error.message : String(error),
    };
    return fallback;
  }
};
