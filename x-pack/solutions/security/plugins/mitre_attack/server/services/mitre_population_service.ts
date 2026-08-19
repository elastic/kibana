/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { LockManagerService, isLockAcquisitionError } from '@kbn/lock-manager';
import {
  MITRE_ATTACK_ENTITY_SO_TYPE,
  MITRE_ATTACK_POPULATION_META_SO_TYPE,
  MITRE_INFERENCE_ID,
} from '../../common/constants';
import type { MitreEntity, MitreEntityAttributes } from '../../common/schema';

// NOTE: dist packaging of the artifact file is out of POC scope.
const ARTIFACT_PATH = join(__dirname, '../../artifacts/mitre_artifact.json');

const POPULATION_STATUS_ID = 'population-status';
const LOCK_ID = 'mitre_attack:population';
const BULK_CREATE_CHUNK_SIZE = 250;
const BULK_UPDATE_BATCH_SIZE = 25;

interface ArtifactFile {
  framework: string;
  framework_version: string;
  content_hash: string;
  entities: MitreEntity[];
}

interface PopulationMetaAttributes {
  artifactVersion: string;
  artifactHash: string;
}

const buildEntityId = (entity: MitreEntity): string =>
  `${entity.framework}:${entity.framework_version}:${entity.id}`;

const buildEntityAttributes = (
  entity: MitreEntity
): Omit<MitreEntityAttributes, 'semantic_content'> => entity;

const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const readMarker = async (
  repository: ISavedObjectsRepository
): Promise<PopulationMetaAttributes | null> => {
  try {
    const so = await repository.get<PopulationMetaAttributes>(
      MITRE_ATTACK_POPULATION_META_SO_TYPE,
      POPULATION_STATUS_ID
    );
    return so.attributes;
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'output' in err &&
      typeof (err as { output: { statusCode?: number } }).output?.statusCode === 'number' &&
      (err as { output: { statusCode: number } }).output.statusCode === 404
    ) {
      return null;
    }
    throw err;
  }
};

const writeMarker = async (
  repository: ISavedObjectsRepository,
  attributes: PopulationMetaAttributes
): Promise<void> => {
  await repository.create<PopulationMetaAttributes>(
    MITRE_ATTACK_POPULATION_META_SO_TYPE,
    attributes,
    { id: POPULATION_STATUS_ID, overwrite: true }
  );
};

const findEntitiesNeedingEmbeddings = async (
  repository: ISavedObjectsRepository
): Promise<Array<{ id: string; name: string; description: string }>> => {
  const result = await repository.search({
    type: MITRE_ATTACK_ENTITY_SO_TYPE,
    namespaces: ['*'],
    query: {
      bool: {
        must_not: { exists: { field: `${MITRE_ATTACK_ENTITY_SO_TYPE}.semantic_content` } },
      },
    },
    // The dataset is ~900 docs so a single page suffices for the POC.
    size: 1000,
    _source: [`${MITRE_ATTACK_ENTITY_SO_TYPE}.name`, `${MITRE_ATTACK_ENTITY_SO_TYPE}.description`],
  });

  return result.hits.hits.map((hit) => {
    const rawId = hit._id ?? '';
    const prefix = `${MITRE_ATTACK_ENTITY_SO_TYPE}:`;
    const id = rawId.startsWith(prefix) ? rawId.slice(prefix.length) : rawId;
    const typeFields = hit._source?.[MITRE_ATTACK_ENTITY_SO_TYPE] as
      | { name?: string; description?: string }
      | undefined;
    const name = typeFields?.name ?? '';
    const description = typeFields?.description ?? '';
    return { id, name, description };
  });
};

export class MitrePopulationService {
  constructor(private readonly coreSetup: CoreSetup, private readonly logger: Logger) {}

  async run(coreStart: CoreStart): Promise<void> {
    try {
      await this._run(coreStart);
    } catch (err: unknown) {
      this.logger.error(`MITRE population service encountered an unexpected error: ${err}`);
    }
  }

  private async _run(coreStart: CoreStart): Promise<void> {
    const repository = coreStart.savedObjects.createInternalRepository([
      MITRE_ATTACK_ENTITY_SO_TYPE,
      MITRE_ATTACK_POPULATION_META_SO_TYPE,
    ]);

    const artifactRaw = await readFile(ARTIFACT_PATH, 'utf-8');
    const artifact: ArtifactFile = JSON.parse(artifactRaw);
    const { framework_version: artifactVersion, entities } = artifact;

    // content_hash is required — a missing hash means the artifact was built without
    // the hash step and would silently leave the gate unable to detect rebuilds.
    if (!artifact.content_hash) {
      throw new Error(
        'MITRE artifact is missing content_hash — rebuild the artifact with the current build script'
      );
    }
    const artifactHash = artifact.content_hash;

    // --- Gate for Phase A: skip only when the stored hash matches the artifact hash.
    // Version is still stored and logged for human readability, but is NOT the gate key.
    // Keying on content_hash ensures that reshipping the same framework_version with
    // corrected entity data (fixed descriptions, new fields, etc.) triggers a refresh.
    const markerBefore = await readMarker(repository);
    if (markerBefore?.artifactHash === artifactHash) {
      // Hash current — Phase A is not needed. Check whether Phase B has real work before
      // paying the cost of acquiring the distributed lock.
      try {
        const pending = await findEntitiesNeedingEmbeddings(repository);
        if (pending.length === 0) {
          this.logger.info(
            `MITRE population: artifact hash ${artifactHash} (version ${artifactVersion}) current and embeddings complete, nothing to do`
          );
          return;
        }
        this.logger.debug(
          `MITRE population: hash current but ${pending.length} entities need embeddings — acquiring lock`
        );
      } catch (preLockErr) {
        // Index may not yet exist on first-ever boot. Do not return early — let the lock
        // path handle it.
        this.logger.debug(
          `MITRE population: pre-lock embedding check failed (falling through): ${preLockErr}`
        );
      }
    }

    const lmService = new LockManagerService(this.coreSetup, this.logger);

    try {
      await lmService.withLock(LOCK_ID, async () => {
        // Re-check inside lock — another node may have finished.
        const marker = await readMarker(repository);
        const hashStale = marker?.artifactHash !== artifactHash;

        // --- Phase A (only when the hash gate says stale) ---
        // bulkCreate with overwrite:true replaces the whole document, which would wipe any
        // existing semantic_content embeddings. That is intentional: a new hash means the
        // entity data changed and embeddings must be rebuilt. This is precisely what makes
        // the hash gate load-bearing — skipping Phase A preserves existing embeddings.
        if (hashStale) {
          this.logger.info(
            `MITRE population Phase A: creating ${entities.length} entities (version ${artifactVersion}, hash ${artifactHash})`
          );
          const chunks = chunk(entities, BULK_CREATE_CHUNK_SIZE);
          for (const batch of chunks) {
            const objects = batch.map((entity) => ({
              type: MITRE_ATTACK_ENTITY_SO_TYPE,
              id: buildEntityId(entity),
              attributes: buildEntityAttributes(entity) as MitreEntityAttributes,
            }));
            await repository.bulkCreate(objects, { overwrite: true });
          }

          await writeMarker(repository, { artifactVersion, artifactHash });
          this.logger.info(`MITRE population Phase A: complete`);
        }

        // --- Phase B: backfill semantic_content ---
        // Query for documents that are MISSING semantic_content (inverse of the old approach).
        // Using the missing-field query as the source of truth means backfillComplete is no
        // longer needed — zero results is the authoritative "all done" signal.
        // This query also works in Milestone 3 when Fleet installs the entities and no
        // bundled artifact exists, because we read from the stored document rather than the artifact.
        //
        // Re-query rather than reusing any pre-lock result — another node may have made
        // progress while we waited for the lock.
        const entitiesToEmbed = await findEntitiesNeedingEmbeddings(repository);

        if (entitiesToEmbed.length === 0) {
          this.logger.info('MITRE population Phase B: embeddings already complete');
          return;
        }

        this.logger.info(
          `MITRE population Phase B: starting semantic_content backfill for ${entitiesToEmbed.length} entities`
        );

        // Warm up the ELSER inference endpoint before batch updates.
        // Adaptive allocations can scale to 0 when idle; the first inference call
        // after a cold start can take well over the default 30s SO/ES client timeout.
        // A pre-flight inference request with a generous timeout ensures the model
        // allocation is live before we start bulkUpdate batches.
        this.logger.info(
          'MITRE population Phase B: warming up ELSER inference endpoint (may take up to 2 min on cold start)'
        );
        try {
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          await esClient.inference.inference(
            { inference_id: MITRE_INFERENCE_ID, input: 'warm-up', timeout: '2m' },
            { requestTimeout: 2 * 60 * 1000 }
          );
          this.logger.info('MITRE population Phase B: ELSER warm-up complete');
        } catch (warmupErr) {
          this.logger.warn(
            `MITRE population Phase B: ELSER warm-up failed (proceeding anyway): ${warmupErr}`
          );
        }

        // Build update objects from the ES document source — NOT from the artifact.
        // Reading from the stored document is what lets Phase B work in Milestone 3,
        // when Fleet installs the entities and no bundled artifact exists.
        const updateItems = entitiesToEmbed.map(({ id, name, description }) => ({
          type: MITRE_ATTACK_ENTITY_SO_TYPE,
          id,
          attributes: {
            semantic_content: `${name}\n\n${description}`,
          } as Partial<MitreEntityAttributes>,
        }));

        const batches = chunk(updateItems, BULK_UPDATE_BATCH_SIZE);
        let totalBackfilled = 0;
        let totalFailures = 0;

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const result = await repository.bulkUpdate(batch);

          for (const item of result.saved_objects) {
            if ('error' in item && item.error) {
              this.logger.warn(
                `MITRE population Phase B: failed to update SO ${item.id}: ${JSON.stringify(
                  item.error
                )}`
              );
              totalFailures++;
            } else {
              totalBackfilled++;
            }
          }

          if ((batchIndex + 1) % 10 === 0) {
            this.logger.info(
              `MITRE population Phase B: backfilled ${totalBackfilled}/${entitiesToEmbed.length}`
            );
          }
        }

        this.logger.info(
          `MITRE population Phase B: complete. backfilled=${totalBackfilled}, failures=${totalFailures}`
        );

        // Write no marker after Phase B. If there were failures, those documents will still
        // be missing semantic_content, so the next startup will automatically retry them
        // via the same missing-field query — no additional state is needed.
        if (totalFailures > 0) {
          this.logger.warn(
            `MITRE population: ${totalFailures} failures during Phase B; next startup will retry automatically (missing docs will be detected by the needs-embedding query)`
          );
        }
      });
    } catch (err: unknown) {
      if (isLockAcquisitionError(err)) {
        this.logger.info('MITRE population: already running on another node, skipping');
        return;
      }
      throw err;
    }
  }
}
