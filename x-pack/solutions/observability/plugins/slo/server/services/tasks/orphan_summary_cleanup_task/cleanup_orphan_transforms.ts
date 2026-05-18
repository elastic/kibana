/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { StoredSLODefinition } from '../../../domain/models';
import { SO_SLO_TYPE } from '../../../saved_objects';

interface Dependencies {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClient;
  logger: Logger;
  abortController: AbortController;
}

interface RunParams {
  from?: number;
  pageSize?: number;
}

interface SLO {
  id: string;
  revision: number;
}

interface SLODefinitionInfo {
  id: string;
  revision: number;
  enabled: boolean;
}

type SLOKey = `${SLO['id']}:::${SLO['revision']}`;

const DEFAULT_PAGE_SIZE = 100;

const SLO_SUMMARY_TRANSFORM_PREFIX = 'slo-summary-';
const SLO_TRANSFORM_PREFIX = 'slo-';
const SLO_TRANSFORM_PATTERN = 'slo-*';

export function parseSloTransformId(transformId: string): SLO | null {
  const isSummary = transformId.startsWith(SLO_SUMMARY_TRANSFORM_PREFIX);
  const prefix = isSummary ? SLO_SUMMARY_TRANSFORM_PREFIX : SLO_TRANSFORM_PREFIX;

  if (!transformId.startsWith(prefix)) {
    return null;
  }

  const remainder = transformId.slice(prefix.length);
  const lastDashIndex = remainder.lastIndexOf('-');
  if (lastDashIndex === -1) {
    return null;
  }

  const sloId = remainder.slice(0, lastDashIndex);
  const revisionStr = remainder.slice(lastDashIndex + 1);
  const revision = Number(revisionStr);

  if (!sloId || !Number.isInteger(revision) || revision < 1) {
    return null;
  }

  return { id: sloId, revision };
}

export async function cleanupOrphanTransforms(
  params: RunParams,
  dependencies: Dependencies
): Promise<void> {
  const { esClient, logger } = dependencies;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  let from = params.from ?? 0;

  try {
    let hasMore = true;

    while (hasMore) {
      const response = await esClient.transform.getTransformStats(
        {
          transform_id: SLO_TRANSFORM_PATTERN,
          from,
          size: pageSize,
          allow_no_match: true,
        },
        { signal: dependencies.abortController.signal }
      );

      const transforms = response.transforms ?? [];
      if (transforms.length === 0) {
        break;
      }

      const sloTransforms: Array<{ transformId: string; slo: SLO; state: string }> = [];
      for (const transform of transforms) {
        const parsed = parseSloTransformId(transform.id);
        if (parsed) {
          sloTransforms.push({
            transformId: transform.id,
            slo: parsed,
            state: transform.state ?? '',
          });
        }
      }

      if (sloTransforms.length > 0) {
        const uniqueSloIds = [...new Set(sloTransforms.map(({ slo }) => slo.id))];
        const definitionMap = await findSloDefinitionMap(uniqueSloIds, dependencies);

        const orphans = sloTransforms.filter(({ slo }) => !definitionMap.has(getKey(slo)));

        if (orphans.length > 0) {
          logger.debug(`Deleting ${orphans.length} orphaned SLO transforms`);

          for (const { transformId } of orphans) {
            try {
              await esClient.transform.deleteTransform(
                { transform_id: transformId, force: true },
                { ignore: [404], signal: dependencies.abortController.signal }
              );
            } catch (err) {
              logger.warn(`Failed to delete orphaned transform [${transformId}]: ${err.message}`);
            }
          }
        }

        const disabledButRunning = sloTransforms.filter(({ slo, state }) => {
          const definition = definitionMap.get(getKey(slo));
          return definition && !definition.enabled && isTransformRunning(state);
        });

        if (disabledButRunning.length > 0) {
          logger.debug(`Stopping ${disabledButRunning.length} transforms for disabled SLOs`);

          for (const { transformId } of disabledButRunning) {
            try {
              await esClient.transform.stopTransform(
                {
                  transform_id: transformId,
                  wait_for_completion: true,
                  force: true,
                  allow_no_match: true,
                },
                { ignore: [404], signal: dependencies.abortController.signal }
              );
            } catch (err) {
              logger.warn(
                `Failed to stop transform [${transformId}] for disabled SLO: ${err.message}`
              );
            }
          }
        }
      }

      from += transforms.length;
      hasMore = transforms.length === pageSize;
    }

    logger.debug('Orphan transforms cleanup completed');
  } catch (error) {
    if (error instanceof errors.RequestAbortedError) {
      logger.debug('Orphan transforms cleanup aborted');
      return;
    }
    throw error;
  }
}

function isTransformRunning(state: string): boolean {
  return state === 'started' || state === 'indexing';
}

async function findSloDefinitionMap(
  sloIds: string[],
  { logger, soClient }: Dependencies
): Promise<Map<SLOKey, SLODefinitionInfo>> {
  const response = await soClient.find<Pick<StoredSLODefinition, 'id' | 'revision' | 'enabled'>>({
    type: SO_SLO_TYPE,
    page: 1,
    perPage: sloIds.length,
    filter: `slo.attributes.id:(${sloIds.join(' or ')})`,
    namespaces: [ALL_SPACES_ID],
    fields: ['id', 'revision', 'enabled'],
  });

  logger.debug(
    `Found ${response.total} matching SLO definitions for ${sloIds.length} transform SLO ids`
  );

  const map = new Map<SLOKey, SLODefinitionInfo>();
  for (const { attributes } of response.saved_objects) {
    map.set(getKey({ id: attributes.id, revision: attributes.revision }), {
      id: attributes.id,
      revision: attributes.revision,
      enabled: attributes.enabled,
    });
  }
  return map;
}

function getKey(item: SLO): SLOKey {
  return `${item.id}:::${item.revision}`;
}
