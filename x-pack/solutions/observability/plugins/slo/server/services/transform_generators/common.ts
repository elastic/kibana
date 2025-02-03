/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { QuerySchema, kqlQuerySchema } from '@kbn/slo-schema';
import { Logger } from '@kbn/logging';
import { DataView } from '@kbn/data-views-plugin/common';
import { SLODefinition } from '../../domain/models';
import { getDelayInSecondsFromSLO } from '../../domain/services/get_delay_in_seconds_from_slo';
import { InvalidTransformError } from '../../errors';

export function getElasticsearchQueryOrThrow(kuery: QuerySchema = '', dataView?: DataView) {
  try {
    if (kqlQuerySchema.is(kuery)) {
      return toElasticsearchQuery(fromKueryExpression(kuery));
    } else {
      return buildEsQuery(
        dataView,
        {
          query: kuery?.kqlQuery,
          language: 'kuery',
        },
        kuery?.filters
      );
    }
  } catch (err) {
    throw new InvalidTransformError(`Invalid KQL: ${kuery}`);
  }
}

export function parseStringFilters(filters: string, logger: Logger) {
  if (!filters) {
    return {};
  }
  try {
    return JSON.parse(filters);
  } catch (e) {
    logger.info(`Failed to parse filters: ${e}`);
    return {};
  }
}

export function parseIndex(index: string): string | string[] {
  if (index.indexOf(',') === -1) {
    return index;
  }

  return index.split(',');
}

export function getTimesliceTargetComparator(timesliceTarget: number) {
  return timesliceTarget === 0 ? '>' : '>=';
}

/**
 * Use the settings.preventInitialBackfill flag to determine the range filter for the rollup transform
 * preventInitialBackfill == true: we use the current time minus some buffer to account for the ingestion delay
 * preventInitialBackfill === false: we use the time window duration to get the data for the last N days
 */
export function getFilterRange(slo: SLODefinition, timestampField: string, isServerless: boolean) {
  if (slo.settings.preventInitialBackfill) {
    return {
      range: {
        [timestampField]: {
          gte: `now-${getDelayInSecondsFromSLO(slo)}s/m`,
        },
      },
    };
  }

  if (isServerless) {
    return {
      range: {
        [timestampField]: {
          gte: `now-7d`,
        },
      },
    };
  }

  return {
    range: {
      [timestampField]: {
        gte: `now-${slo.timeWindow.duration.format()}/d`,
      },
    },
  };
}
