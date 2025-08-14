/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionHandlerResponse } from '@kbn/cases-plugin/common';
import { AttachmentType, type SuggestionContext } from '@kbn/cases-plugin/common';
import type { SuggestionType } from '@kbn/cases-plugin/server';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { sloPaths } from '../../../common';
import type { SLOSuggestion } from '../../../common/cases/suggestions';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/constants';
import type { EsSummaryDocument } from '../../services/summary_transform_generator/helpers/create_temp_summary';
import { getFlattenedGroupings } from '../../services/utils';
import { toHighPrecision } from '../../utils/number';

export function getSLOByServiceName(
  coreStart: CoreStart,
  logger: Logger
): SuggestionType<SLOSuggestion> {
  return {
    id: 'sloByServiceName',
    attachmentTypeId: '.page',
    owner: 'observability',
    handlers: {
      searchSLOByServiceName: {
        tool: {
          description: 'Suggest SLOs operating on the same service.',
          schema: {
            type: 'object',
            properties: {
              serviceName: {
                type: 'string',
                description: 'Name of the relevant service',
              },
            },
          },
        },
        handler: async ({
          context: { 'service.name': serviceName },
          request,
        }: {
          context: SuggestionContext;
          request: KibanaRequest;
        }): Promise<SuggestionHandlerResponse<SLOSuggestion>> => {
          const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);

          if (!serviceName) {
            return { suggestions: [] };
          }

          const results = await scopedClusterClient.asCurrentUser.search<EsSummaryDocument>({
            index: SUMMARY_DESTINATION_INDEX_PATTERN,
            size: 10,
            sort: [
              {
                summaryUpdatedAt: {
                  order: 'desc',
                },
              },
            ],
            query: {
              bool: {
                filter: [
                  {
                    term: {
                      'slo.groupings.service.name': serviceName[0],
                    },
                  },
                ],
                must_not: [
                  {
                    term: {
                      status: {
                        value: 'NO_DATA',
                      },
                    },
                  },
                  {
                    term: {
                      isTempDoc: {
                        value: true,
                      },
                    },
                  },
                ],
              },
            },
          });
          const suggestions = results.hits.hits.map((doc) => {
            const src = doc._source!;
            const payload: SLOSuggestion = {
              id: src.slo.id,
              name: src.slo.name,
              description: src.slo.description,
              indicator: src.slo.indicator as any,
              timeWindow: src.slo.timeWindow,
              budgetingMethod: src.slo.budgetingMethod,
              objective: {
                target: src.slo.objective.target,
                timesliceTarget: src.slo.objective.timesliceTarget ?? undefined,
                timesliceWindow: src.slo.objective.timesliceWindow ?? undefined,
              },
              settings: {
                syncDelay: '1m',
                frequency: '1m',
                preventInitialBackfill: false,
              },
              revision: src.slo.revision,
              enabled: true,
              tags: src.slo.tags,
              createdAt: src.slo.createdAt ?? '2024-01-01T00:00:00.000Z',
              updatedAt: src.slo.updatedAt ?? '2024-01-01T00:00:00.000Z',
              groupBy: src.slo.groupBy,
              version: 1,
              ...(src.slo.createdBy ? { createdBy: src.slo.createdBy } : {}),
              ...(src.slo.updatedBy ? { updatedBy: src.slo.updatedBy } : {}),
              instanceId: src.slo.instanceId,
              groupings: getFlattenedGroupings({
                groupings: src.slo.groupings,
                groupBy: src.slo.groupBy,
              }),
              summary: {
                status: src.status,
                sliValue: toHighPrecision(src.sliValue),
                errorBudget: {
                  initial: toHighPrecision(src.errorBudgetInitial),
                  consumed: toHighPrecision(src.errorBudgetConsumed),
                  remaining: toHighPrecision(src.errorBudgetRemaining),
                  isEstimated: src.errorBudgetEstimated,
                },
                fiveMinuteBurnRate: toHighPrecision(src.fiveMinuteBurnRate?.value ?? 0),
                oneHourBurnRate: toHighPrecision(src.oneHourBurnRate?.value ?? 0),
                oneDayBurnRate: toHighPrecision(src.oneDayBurnRate?.value ?? 0),
                summaryUpdatedAt: src.summaryUpdatedAt,
              },
            };
            return { ...payload, status: src.status };
          });

          return {
            suggestions: [
              {
                id: 'slo',
                description: `Found ${suggestions.length} SLOs linked to service "${serviceName}"`,
                data: suggestions.map((suggestion) => ({
                  id: `${suggestion.id}-${suggestion.instanceId}`,
                  description: `SLO "${suggestion.name}" is ${suggestion.status}`,
                  payload: suggestion,
                  attachment: {
                    type: AttachmentType.persistableState,
                    persistableStateAttachmentTypeId: '.page',
                    persistableStateAttachmentState: {
                      type: 'slo_history',
                      url: {
                        pathAndQuery: sloPaths.sloDetailsHistory({
                          id: suggestion.id,
                          instanceId: suggestion.instanceId,
                        }),
                        label: suggestion.name,
                        actionLabel: i18n.translate('xpack.slo.addToCase.caseAttachmentLabel', {
                          defaultMessage: 'Go to SLO history',
                        }),
                        iconType: 'metricbeatApp',
                      },
                    },
                  },
                })),
              },
            ],
          };
        },
      },
    },
  };
}
