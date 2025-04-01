/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isCCSRemoteIndexName } from '@kbn/es-query';
import { ALL_VALUE } from '@kbn/slo-schema';
import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { StoredSLODefinition } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';
import { Usage } from './type';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/constants';

export const fetcher = async (context: CollectorFetchContext) => {
  const finder = context.soClient.createPointInTimeFinder<StoredSLODefinition>({
    type: SO_SLO_TYPE,
    perPage: 100,
  });

  const totalInstances = await context.esClient.count({
    index: SUMMARY_DESTINATION_INDEX_PATTERN,
    query: {
      bool: {
        filter: [
          {
            term: {
              isTempDoc: false,
            },
          },
        ],
      },
    },
  });

  let usage: Usage['slo'] = {
    total: 0,
    definitions: {
      total: 0,
      total_with_ccs: 0,
      total_with_groups: 0,
    },
    instances: {
      total: totalInstances?.count ?? 0,
    },
    by_status: {
      enabled: 0,
      disabled: 0,
    },
    by_sli_type: {},
    by_rolling_duration: {},
    by_calendar_aligned_duration: {},
    by_budgeting_method: {
      occurrences: 0,
      timeslices: 0,
    },
  };

  for await (const response of finder.find()) {
    usage = response.saved_objects.reduce((acc, so) => {
      return {
        ...acc,
        total: acc.total + 1, // deprecated in favor of definitions.total
        definitions: {
          total: acc.definitions.total + 1,
          total_with_ccs: isCCSRemoteIndexName(so.attributes.indicator.params.index)
            ? acc.definitions.total_with_ccs + 1
            : acc.definitions.total_with_ccs,
          total_with_groups: [so.attributes.groupBy].flat().includes(ALL_VALUE)
            ? acc.definitions.total_with_groups
            : acc.definitions.total_with_groups + 1,
        },
        by_status: {
          ...acc.by_status,
          ...(so.attributes.enabled && { enabled: acc.by_status.enabled + 1 }),
          ...(!so.attributes.enabled && { disabled: acc.by_status.disabled + 1 }),
        },
        by_sli_type: {
          ...acc.by_sli_type,
          [so.attributes.indicator.type]: (acc.by_sli_type[so.attributes.indicator.type] ?? 0) + 1,
        },
        by_rolling_duration: {
          ...acc.by_rolling_duration,
          ...(so.attributes.timeWindow.type === 'rolling' && {
            [so.attributes.timeWindow.duration]:
              (acc.by_rolling_duration[so.attributes.timeWindow.duration] ?? 0) + 1,
          }),
        },
        by_calendar_aligned_duration: {
          ...acc.by_calendar_aligned_duration,
          ...(so.attributes.timeWindow.type === 'calendarAligned' && {
            [so.attributes.timeWindow.duration]:
              (acc.by_calendar_aligned_duration[so.attributes.timeWindow.duration] ?? 0) + 1,
          }),
        },
        by_budgeting_method: {
          ...acc.by_budgeting_method,
          ...(so.attributes.budgetingMethod === 'occurrences' && {
            occurrences: acc.by_budgeting_method.occurrences + 1,
          }),
          ...(so.attributes.budgetingMethod === 'timeslices' && {
            timeslices: acc.by_budgeting_method.timeslices + 1,
          }),
        },
      };
    }, usage);
  }

  await finder.close();

  return {
    slo: usage,
  };
};
