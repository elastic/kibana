/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, LoggerFactory } from '@kbn/core/server';
import { ReplaySubject, type Subject } from 'rxjs';
import { IndexPatternAdapter, type FieldMap, type InstallParams } from '@kbn/index-adapter';
import {
  buildMitreAttackFieldMap,
  loadMitreAttackArtifact,
  loadMitreAttackArtifactVersion,
} from '@kbn/security-mitre-attack-common';
import { hydrateIndex } from './hydration';
import { MitreAttackDataClient } from './mitre_attack_data_client';
import { MITRE_DEFAULT_INFERENCE_ID, ensureSemanticEndpointAvailable } from './semantic';

const INDEX_BASE_NAME = '.kibana-mitre-attack';
const INDEX_TEMPLATE_NAME = 'mitre-attack-template';
const COMPONENT_TEMPLATE_NAME = 'mitre-attack-mappings';

export interface MitreAttackDataServiceSetupParams {
  esClient: ElasticsearchClient;
  /**
   * Optional override; the service owns its own `ReplaySubject` so callers can
   * pass nothing in the common case and just invoke `stop()` on shutdown.
   */
  pluginStop$?: Subject<void>;
  tasksTimeoutMs?: number;
  /**
   * Opt in to embedding entities into a `semantic_text` field. Ignored when the
   * inference endpoint turns out to be unavailable.
   */
  semantic?: {
    enabled: boolean;
    /** Defaults to the preconfigured ELSER endpoint. */
    inferenceId?: string;
  };
}

export interface MitreAttackDataServiceCreateClientParams {
  spaceId: string;
  esClient: ElasticsearchClient;
}

/**
 * Owns the lifecycle of the managed `.kibana-mitre-attack-{spaceId}` index.
 *
 * - On `setup()`, resolves whether semantic search is usable and then installs
 *   the index/component templates via `IndexPatternAdapter`. Templates are
 *   global; concrete indices are created lazily per space.
 * - `hydrate(spaceId)` ensures the concrete index exists and that its stamp
 *   matches the bundled artifact. Idempotent and concurrency-safe per space.
 * - `createClient({ spaceId, esClient })` returns a read-only client that
 *   resolves the index name (waiting on hydration if needed) on every call.
 */
export class MitreAttackDataService {
  private readonly logger: Logger;
  private readonly adapter: IndexPatternAdapter;
  private readonly hydrationPromises = new Map<string, Promise<void>>();
  private readonly ownedPluginStop$ = new ReplaySubject<void>(1);
  private installPromise?: Promise<void>;
  private internalEsClient?: ElasticsearchClient;
  private installed = false;
  /** Set once `setup()` resolves; `undefined` means keyword-only. */
  private semanticInferenceId?: string;

  constructor(loggerFactory: LoggerFactory, kibanaVersion: string) {
    this.logger = loggerFactory.get('mitreAttack');
    this.adapter = new IndexPatternAdapter(INDEX_BASE_NAME, { kibanaVersion });
  }

  /**
   * Install templates and update existing indices. Idempotent — concurrent
   * callers share the same install promise.
   */
  setup({
    esClient,
    pluginStop$,
    tasksTimeoutMs,
    semantic,
  }: MitreAttackDataServiceSetupParams): Promise<void> {
    if (this.installPromise) {
      return this.installPromise;
    }
    this.internalEsClient = esClient;
    const params: InstallParams = {
      esClient,
      pluginStop$: pluginStop$ ?? this.ownedPluginStop$,
      tasksTimeoutMs,
      logger: this.logger,
    };

    this.installPromise = this.runInstall(params, semantic).then(() => {
      this.installed = true;
    });
    return this.installPromise;
  }

  private async runInstall(
    params: InstallParams,
    semantic: MitreAttackDataServiceSetupParams['semantic']
  ): Promise<void> {
    this.semanticInferenceId = await this.resolveSemanticInferenceId(
      await params.esClient,
      semantic
    );

    this.adapter.setComponentTemplate({
      name: COMPONENT_TEMPLATE_NAME,
      fieldMap: buildMitreAttackFieldMap({
        semanticInferenceId: this.semanticInferenceId,
      }) as unknown as FieldMap,
    });
    this.adapter.setIndexTemplate({
      name: INDEX_TEMPLATE_NAME,
      componentTemplateRefs: [COMPONENT_TEMPLATE_NAME],
    });

    await this.adapter.install(params);
  }

  private async resolveSemanticInferenceId(
    esClient: ElasticsearchClient,
    semantic: MitreAttackDataServiceSetupParams['semantic']
  ): Promise<string | undefined> {
    if (!semantic?.enabled) {
      return undefined;
    }
    const inferenceId = semantic.inferenceId ?? MITRE_DEFAULT_INFERENCE_ID;
    const available = await ensureSemanticEndpointAvailable({
      esClient,
      inferenceId,
      logger: this.logger,
    });
    return available ? inferenceId : undefined;
  }

  /**
   * Signal shutdown so any in-flight install/hydration tasks can bail early.
   */
  stop() {
    this.ownedPluginStop$.next();
    this.ownedPluginStop$.complete();
  }

  /**
   * Ensure the per-space index exists and is hydrated to the bundled artifact's
   * stamp. Subsequent calls for the same space return the cached promise,
   * making this safe to call eagerly on `start()` and lazily from request
   * handlers.
   */
  async hydrate(spaceId: string): Promise<void> {
    if (!this.installed || !this.installPromise || !this.internalEsClient) {
      throw new Error('MitreAttackDataService.setup must complete before hydrate');
    }
    const existing = this.hydrationPromises.get(spaceId);
    if (existing) return existing;

    const promise = this.runHydration(spaceId).catch((err) => {
      this.hydrationPromises.delete(spaceId);
      throw err;
    });
    this.hydrationPromises.set(spaceId, promise);
    return promise;
  }

  private async runHydration(spaceId: string): Promise<void> {
    if (!this.internalEsClient || !this.installPromise) {
      throw new Error('MitreAttackDataService.setup must complete before hydrate');
    }
    await this.installPromise;
    await this.adapter.createIndex(spaceId);
    const indexName = this.adapter.getIndexName(spaceId);
    const artifact = loadMitreAttackArtifact();
    await hydrateIndex({
      esClient: this.internalEsClient,
      indexName,
      artifact,
      logger: this.logger,
      semanticInferenceId: this.semanticInferenceId,
    });
  }

  /**
   * Read-only client. The client lazily awaits hydration on every call so
   * non-default spaces hydrate transparently on first use.
   */
  createClient({
    spaceId,
    esClient,
  }: MitreAttackDataServiceCreateClientParams): MitreAttackDataClient {
    return new MitreAttackDataClient({
      esClient,
      logger: this.logger,
      resolveTarget: async () => {
        await this.hydrate(spaceId);
        return {
          indexName: this.adapter.getIndexName(spaceId),
          semanticEnabled: this.semanticInferenceId != null,
        };
      },
    });
  }

  /** Returns the artifact version stamp without paying entity-list parse cost. */
  getArtifactStamp(): string {
    return loadMitreAttackArtifactVersion().stamp;
  }

  /** Whether the installed mapping carries embeddings. Valid after `setup()`. */
  isSemanticEnabled(): boolean {
    return this.semanticInferenceId != null;
  }
}
