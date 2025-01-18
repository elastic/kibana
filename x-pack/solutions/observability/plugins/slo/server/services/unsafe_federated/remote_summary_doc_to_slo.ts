/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { Indicator, indicatorSchema, sloDefinitionSchema } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { isLeft } from 'fp-ts/lib/Either';
import { SLODefinition } from '../../domain/models';
import { EsSummaryDocument } from '../summary_transform_generator/helpers/create_temp_summary';

export function fromRemoteSummaryDocumentToSloDefinition(
  summaryDoc: EsSummaryDocument,
  logger: Logger
): SLODefinition | undefined {
  const res = sloDefinitionSchema.decode({
    id: summaryDoc.slo.id,
    name: summaryDoc.slo.name,
    description: summaryDoc.slo.description,
    indicator: getIndicator(summaryDoc, logger),
    timeWindow: summaryDoc.slo.timeWindow,
    budgetingMethod: summaryDoc.slo.budgetingMethod,
    objective: {
      target: summaryDoc.slo.objective.target,
      timesliceTarget: summaryDoc.slo.objective.timesliceTarget ?? undefined,
      timesliceWindow: summaryDoc.slo.objective.timesliceWindow ?? undefined,
    },
    settings: {
      syncDelay: '1m',
      frequency: '1m',
      // added in 8.15.0
      preventInitialBackfill: false,
    },
    revision: summaryDoc.slo.revision,
    enabled: true,
    tags: summaryDoc.slo.tags,
    createdAt: summaryDoc.slo.createdAt ?? '2024-01-01T00:00:00.000Z', // fallback prior 8.14
    updatedAt: summaryDoc.slo.updatedAt ?? '2024-01-01T00:00:00.000Z', // fallback prior 8.14
    groupBy: summaryDoc.slo.groupBy,
    version: 1,
  });

  if (isLeft(res)) {
    const errors = formatErrors(res.left);
    logger.error(`Invalid remote stored summary SLO with id [${summaryDoc.slo.id}]`);
    logger.error(errors.join('|'));

    return undefined;
  }

  return res.right;
}

/**
 * Temporary documents priors to 8.14 don't have indicator.params, therefore we need to fallback to a dummy
 */
function getIndicator(summaryDoc: EsSummaryDocument, logger: Logger): Indicator {
  const res = indicatorSchema.decode(summaryDoc.slo.indicator);

  if (isLeft(res)) {
    const errors = formatErrors(res.left);
    logger.info(
      `Invalid indicator from remote summary SLO id [${summaryDoc.slo.id}] - Fallback on dummy indicator`
    );
    logger.info(errors.join('|'));

    return getDummyIndicator(summaryDoc);
  }

  return res.right;
}

function getDummyIndicator(summaryDoc: EsSummaryDocument): Indicator {
  const indicatorType = summaryDoc.slo.indicator.type;
  let indicator: Indicator;
  switch (indicatorType) {
    case 'sli.kql.custom':
      indicator = {
        type: indicatorType,
        params: {
          index: '',
          good: '',
          total: '',
          timestampField: '',
        },
      };
      break;
    case 'sli.apm.transactionDuration':
      indicator = {
        type: indicatorType,
        params: {
          environment: '',
          service: '',
          transactionType: '',
          transactionName: '',
          threshold: 0,
          index: '',
        },
      };
      break;
    case 'sli.apm.transactionErrorRate':
      indicator = {
        type: indicatorType,
        params: {
          environment: '',
          service: '',
          transactionType: '',
          transactionName: '',
          index: '',
        },
      };
      break;
    case 'sli.metric.custom':
      indicator = {
        type: indicatorType,
        params: {
          index: '',
          good: { metrics: [{ name: '', aggregation: 'sum', field: '' }], equation: '' },
          total: { metrics: [{ name: '', aggregation: 'sum', field: '' }], equation: '' },
          timestampField: '',
        },
      };
      break;
    case 'sli.metric.timeslice':
      indicator = {
        type: indicatorType,
        params: {
          index: '',
          metric: {
            metrics: [],
            equation: '',
            threshold: 0,
            comparator: 'GT',
          },
          timestampField: '',
        },
      };
      break;
    case 'sli.histogram.custom':
      indicator = {
        type: indicatorType,
        params: {
          index: '',
          timestampField: '',
          good: { field: '', aggregation: 'value_count' },
          total: { field: '', aggregation: 'value_count' },
        },
      };
      break;
    case 'sli.synthetics.availability':
      indicator = {
        type: indicatorType,
        params: {
          projects: [],
          tags: [],
          monitorIds: [
            {
              value: '*',
              label: 'All',
            },
          ],
          index: 'synthetics-*',
          filter: '',
        },
      };
      break;
    default:
      assertNever(indicatorType);
  }

  return indicator;
}
