/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsqlEsqlResult, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { isString } from 'lodash';
import type { EntityContainer } from '../../../../../common/api/entity_analytics/entity_store/entities/upsert_entities_bulk.gen';
import type { EntityAfterKey } from '../../../../../common/api/entity_analytics/common';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import type { EntityMaintainer, EntityMaintainerConfig } from '../maintainer';

interface ApplyMaintainerLogicOpts {
  abortController: AbortController;
  entityType: EntityType;
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger;
  lowerBounds?: EntityAfterKey;
  upperBounds: EntityAfterKey;
  maintainerDef: EntityMaintainer;
  maintainerConfig: EntityMaintainerConfig;
}

export const applyMaintainerLogic = async (
  opts: ApplyMaintainerLogicOpts
): Promise<EntityContainer[]> => {
  const identifierField = EntityTypeToIdentifierField[opts.entityType];

  const lower = opts.lowerBounds?.[identifierField]
    ? `${identifierField} > ${opts.lowerBounds[identifierField]}`
    : undefined;
  const upper = `${identifierField} <= ${opts.upperBounds[identifierField]}`;
  if (!lower && !upper) {
    throw new Error('Either lower or upper after key must be provided for pagination');
  }
  const rangeClause = [lower, upper].filter(Boolean).join(' and ');

  const esqlQuery = opts.maintainerDef.getQuery(opts.index, opts.entityType, rangeClause);
  if (!esqlQuery) {
    throw new Error(
      `No ES|QL query generated for entity type ${opts.entityType} in maintainer ${opts.maintainerDef.id}`
    );
  }

  // Execute the ES|QL query
  const response = await opts.esClient.esql.query(
    {
      query: esqlQuery,
      filter: {
        bool: {
          filter: [
            {
              range: {
                [opts.maintainerConfig.timeField]: {
                  lt: 'now',
                  gte: `now-${opts.maintainerConfig.lookbackWindow}`,
                },
              },
            },
          ],
        },
      },
    },
    { signal: opts.abortController.signal }
  );

  return processResponse({
    entityType: opts.entityType,
    maintainerDef: opts.maintainerDef,
    response,
  });
};

interface ProcessResponseOpts {
  entityType: EntityType;
  response: EsqlEsqlResult;
  maintainerDef: EntityMaintainer;
}
export const processResponse = ({
  entityType,
  maintainerDef,
  response,
}: ProcessResponseOpts): EntityContainer[] => {
  const identifierField = EntityTypeToIdentifierField[entityType];
  const columns = response.columns.map((col: { name: string; type: string }) => col.name);
  const values = response.values || [];
  return values.map((row: FieldValue[]) => {
    const record = row.reduce((obj, value, index) => {
      if (columns[index] === identifierField) {
        obj.id = value;
      } else {
        const normalizedVal: string[] = isString(value) ? [value] : (value as unknown as string[]);
        obj[columns[index]] = normalizedVal;
      }
      return obj;
    }, {} as Record<string, unknown>);

    const formattedRecord = maintainerDef.formatRecord
      ? maintainerDef.formatRecord(record)
      : record;

    return { type: entityType, record: formattedRecord } as EntityContainer;
  });
};
