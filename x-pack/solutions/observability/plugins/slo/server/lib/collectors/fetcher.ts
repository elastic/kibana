/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isNonLocalIndexName } from '@kbn/es-query';
import type {
  ISavedObjectsPointInTimeFinder,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { ALL_VALUE, COMPOSITE_SLO_MAX_MEMBERS } from '@kbn/slo-schema';
import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import type { StoredCompositeSLODefinition, StoredSLODefinition } from '../../domain/models';
import { SO_SLO_COMPOSITE_TYPE, SO_SLO_TYPE } from '../../saved_objects';
import type { Usage } from './type';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/constants';

export type GetCompositeSoClient = () => Promise<SavedObjectsClientContract>;

const getEmptyCompositeUsage = (): Usage['composite'] => ({
  definitions: { total: 0 },
  by_status: { enabled: 0, disabled: 0 },
  by_budgeting_method: { occurrences: 0 },
  by_composite_method: { weightedAverage: 0 },
  members: { min: 0, avg: 0, max: 0, at_max_count: 0 },
});

const fetchCompositeUsage = async (
  getCompositeSoClient: GetCompositeSoClient,
  logger: Logger
): Promise<Usage['composite']> => {
  const usage = getEmptyCompositeUsage();
  let totalMembers = 0;
  let finder: ISavedObjectsPointInTimeFinder<StoredCompositeSLODefinition, unknown> | undefined;

  try {
    const soClient = await getCompositeSoClient();
    finder = soClient.createPointInTimeFinder<StoredCompositeSLODefinition>({
      type: SO_SLO_COMPOSITE_TYPE,
      perPage: 100,
      namespaces: ['*'],
    });

    for await (const response of finder.find()) {
      for (const { attributes } of response.saved_objects) {
        const { enabled, budgetingMethod, compositeMethod, members } = attributes;
        const membersCount = members.length;

        usage.definitions.total += 1;
        usage.by_status[enabled ? 'enabled' : 'disabled'] += 1;
        usage.by_budgeting_method[budgetingMethod] += 1;
        usage.by_composite_method[compositeMethod] += 1;

        totalMembers += membersCount;
        usage.members.min =
          usage.definitions.total === 1 ? membersCount : Math.min(usage.members.min, membersCount);
        usage.members.max = Math.max(usage.members.max, membersCount);
        if (membersCount >= COMPOSITE_SLO_MAX_MEMBERS) {
          usage.members.at_max_count += 1;
        }
      }
    }

    usage.members.avg =
      usage.definitions.total > 0
        ? Math.round((totalMembers / usage.definitions.total) * 100) / 100
        : 0;
  } catch (error) {
    logger.warn(`Failed to collect composite SLO usage: ${error.message}`);
    return getEmptyCompositeUsage();
  } finally {
    await finder
      ?.close()
      .catch((error) => logger.warn(`Failed to close composite SLO finder: ${error.message}`));
  }

  return usage;
};

export const fetcher = async (
  context: CollectorFetchContext,
  logger: Logger,
  getCompositeSoClient: GetCompositeSoClient
) => {
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

  let sloUsage: Usage['slo'] = {
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
    sloUsage = response.saved_objects.reduce((acc, so) => {
      return {
        ...acc,
        total: acc.total + 1, // deprecated in favor of definitions.total
        definitions: {
          total: acc.definitions.total + 1,
          total_with_ccs: isNonLocalIndexName(so.attributes.indicator.params.index)
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
    }, sloUsage);
  }

  await finder.close();

  return {
    slo: sloUsage,
    composite: await fetchCompositeUsage(getCompositeSoClient, logger),
  };
};
