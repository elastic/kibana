/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import pMap from 'p-map';
import Papa from 'papaparse';
import { isEmpty, toLower, trim } from 'lodash';
import { ALL_ENTITY_TYPES, EntityType } from '@kbn/entity-store/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  BulkObject as BulkUpdateObject,
  BulkObjectResponse,
  EntityStoreCRUDClient,
} from '@kbn/entity-store/server';
import { ENGINE_METADATA_TYPE_FIELD } from '@kbn/entity-store/server';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import { AssetCriticalityLevel } from '../../../../common/api/entity_analytics/asset_criticality/common.gen';
import type { HapiReadableStream } from '../../../types';

export const ALL_ASSET_CRITICALITY_LEVELS = Object.values(AssetCriticalityLevel.enum);
export const UNASSIGN_CRITICALITY_VALUE = 'unassign';

// Process the CSV file in batches
const CSV_BATCH_SIZE = 1000;

const TYPE_HEADER = 'type';
const CRITICALITY_LEVEL_HEADER = 'criticality_level';

// Columns that must be present in the CSV file
const REQUIRED_CSV_HEADERS: string[] = [TYPE_HEADER, CRITICALITY_LEVEL_HEADER];

const MAX_ITERATIONS = 100;
const LIST_PAGE_SIZE = 100;

interface CsvUploadV2Opts {
  batchSize?: number;
  entityStoreClient: EntityStoreCRUDClient;
  fileStream: HapiReadableStream;
  logger: Logger;
}

interface CsvUploadRowResponse {
  status: 'success' | 'unmatched' | 'failure';
  matchedEntities: number;
  error?: string;
}

interface CsvUploadV2Response {
  successful: number;
  failed: number;
  total: number;
  unmatched: number;
  items: CsvUploadRowResponse[];
}

interface ProcessBatchOpts {
  batch: Array<Record<string, unknown>>;
  entityStoreClient: EntityStoreCRUDClient;
  logger: Logger;
  startIndex: number;
  results: CsvUploadRowResponse[];
}

type BulkUpdateObjectWithNdx = BulkUpdateObject & { ndx: number };

interface ProcessRowOpts {
  entityStoreClient: EntityStoreCRUDClient;
  index: number;
  logger: Logger;
  row: Record<string, unknown>;
}

interface ProcessRowResult {
  numEntitiesMatched: number;
  docs: BulkUpdateObjectWithNdx[];
}

interface UpdateEntityDocsOpts {
  entityStoreClient: EntityStoreCRUDClient;
  docs: BulkUpdateObjectWithNdx[];
  logger: Logger;
  results: CsvUploadRowResponse[];
}

const updateEntityDocs = async ({ entityStoreClient, docs, results }: UpdateEntityDocsOpts) => {
  const errors: BulkObjectResponse[] = await entityStoreClient.bulkUpdateEntity({
    objects: docs.map((d) => ({ type: d.type, doc: d.doc })),
    force: true, // required to update asset criticality
  });

  if (errors.length === 0) return;

  for (const err of errors) {
    // find the doc with matching ID
    // this should be the hashed entity.id value
    const docId = err._id;
    const originalUpdateDoc = docs.find((d) => {
      if (d.doc.entity?.id != null) {
        return hashEuid(d.doc.entity.id) === docId;
      }
      return false;
    });
    if (originalUpdateDoc) {
      results[originalUpdateDoc.ndx].status = 'failure';
      results[originalUpdateDoc.ndx].error =
        err.reason ?? `Bulk update failed (status ${err.status})`;
    }
  }
};

const processRow = async ({
  entityStoreClient,
  index,
  logger,
  row,
}: ProcessRowOpts): Promise<ProcessRowResult> => {
  let type = row[TYPE_HEADER];
  type = typeof type === 'string' ? toLower(type) : type;
  if (!EntityType.safeParse(type).success) {
    throw new Error(
      `Invalid entity type: "${type}". Must be one of: ${ALL_ENTITY_TYPES.join(', ')}`
    );
  }

  let criticalityLevel = row[CRITICALITY_LEVEL_HEADER];
  criticalityLevel =
    typeof criticalityLevel === 'string' ? toLower(criticalityLevel) : criticalityLevel;
  if (
    criticalityLevel !== UNASSIGN_CRITICALITY_VALUE &&
    !AssetCriticalityLevel.safeParse(criticalityLevel).success
  ) {
    throw new Error(
      `Invalid criticality level: "${criticalityLevel}". Must be one of: ${[
        ...ALL_ASSET_CRITICALITY_LEVELS,
        UNASSIGN_CRITICALITY_VALUE,
      ].join(', ')}`
    );
  }

  const queryFilters: QueryDslQueryContainer[] = Object.entries(row)
    .filter(([field, value]) => !REQUIRED_CSV_HEADERS.includes(field) && !isEmpty(value))
    .map(([field, value]) => ({ term: { [field]: value } } as QueryDslQueryContainer));

  if (!queryFilters.length) {
    throw new Error('Row has no identifying fields');
  }

  // Add type filter
  queryFilters.push({ term: { [ENGINE_METADATA_TYPE_FIELD]: type } } as QueryDslQueryContainer);

  let iters = 0;
  let searchAfter: Array<string | number> | undefined;
  let numEntitiesMatched = 0;
  const docs: BulkUpdateObjectWithNdx[] = [];

  while (true) {
    if (iters >= MAX_ITERATIONS) {
      // failsafe to prevent infinite looping
      logger.warn(
        `Max iterations of ${MAX_ITERATIONS} reached while processing CSV row ${index}. ${
          MAX_ITERATIONS * LIST_PAGE_SIZE
        } entities will be updated for this row.`
      );
      break;
    }

    const { entities, nextSearchAfter } = await entityStoreClient.listEntities({
      filter: queryFilters,
      size: LIST_PAGE_SIZE,
      source: ['entity.id'],
      searchAfter,
    });

    if (entities.length === 0) {
      break;
    }

    for (const entity of entities) {
      const entityId = entity.entity?.id;
      if (entityId) {
        numEntitiesMatched++;
        docs.push({
          ndx: index,
          type: type as EntityType,
          doc: {
            entity: { id: entityId },
            asset: {
              criticality:
                criticalityLevel === UNASSIGN_CRITICALITY_VALUE
                  ? (null as unknown as AssetCriticalityLevel)
                  : (criticalityLevel as AssetCriticalityLevel),
            },
          },
        });
      }
    }

    searchAfter = nextSearchAfter;
    if (!searchAfter || entities.length < LIST_PAGE_SIZE) {
      break;
    }

    iters++;
  }

  return { numEntitiesMatched, docs };
};

const processBatch = async ({
  batch,
  entityStoreClient,
  logger,
  results,
  startIndex = 0,
}: ProcessBatchOpts) => {
  const rowResults = await pMap(
    batch,
    async (row, i) => {
      const currIndex = startIndex + i;
      let error: string | undefined;
      let numEntitiesMatched = 0;
      let docs: BulkUpdateObjectWithNdx[] = [];
      try {
        ({ numEntitiesMatched, docs } = await processRow({
          entityStoreClient,
          index: currIndex,
          logger,
          row,
        }));
      } catch (err) {
        logger.error(`Error processing row ${currIndex}: ${err}`);
        error = `Error processing row: ${err.message}`;
      }
      return { error, numEntitiesMatched, docs };
    },
    { concurrency: 10 }
  );

  const docsToUpdate: BulkUpdateObjectWithNdx[] = [];
  for (const { error, numEntitiesMatched, docs } of rowResults) {
    docsToUpdate.push(...docs);
    results.push({
      error,
      matchedEntities: numEntitiesMatched,
      status: error ? 'failure' : numEntitiesMatched > 0 ? 'success' : 'unmatched',
    });
  }

  try {
    await updateEntityDocs({ entityStoreClient, docs: docsToUpdate, logger, results });
  } catch (err) {
    // Bulk update failed, mark all rows in batch as failed
    logger.error(`Bulk update failed for batch starting at index ${startIndex}: ${err}`);
    for (let i = 0; i < batch.length; i++) {
      const result = results[startIndex + i];
      if (result.status === 'success') {
        result.status = 'failure';
        result.error = `Bulk update failed: ${err.message}`;
      }
    }
  }
};

const validateCsvHeader = (header: string[]): void => {
  const missingHeaders = REQUIRED_CSV_HEADERS.filter((required) => !header.includes(required));
  if (missingHeaders.length > 0) {
    throw Boom.badRequest(`CSV header is missing required fields: ${missingHeaders.join(', ')}`);
  }
};

export const csvUploadV2 = async (opts: CsvUploadV2Opts): Promise<CsvUploadV2Response> => {
  const { entityStoreClient, fileStream, logger, batchSize = CSV_BATCH_SIZE } = opts;
  const results: CsvUploadRowResponse[] = [];
  const csvStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    transformHeader: (header) => toLower(trim(header)), // trim header fields to prevent issues with extra spaces
    transform: (value) => (typeof value === 'string' ? trim(value) : value), // trim string values to prevent issues with extra spaces
  });

  const parsedStream = fileStream.pipe(csvStream);

  let headersValidated = false;
  let batch: Array<Record<string, unknown>> = [];
  let startIndex = 0;

  for await (const untypedRow of parsedStream) {
    const row = untypedRow as Record<string, unknown>;

    if (!headersValidated) {
      validateCsvHeader(Object.keys(row));
      headersValidated = true;
    }

    batch.push(row);

    if (batch.length >= batchSize) {
      await processBatch({ entityStoreClient, batch, logger, results, startIndex });
      startIndex += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await processBatch({ entityStoreClient, batch, logger, results, startIndex });
  }

  // Get status counts from results
  const total = results.length;
  const successful = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'failure').length;
  const unmatched = results.filter((r) => r.status === 'unmatched').length;

  return { total, successful, failed, unmatched, items: results };
};
