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
import type { AttachmentFramework } from '@kbn/cases-plugin/server/attachment_framework/types';
import type { AttachmentItem } from '@kbn/cases-plugin/common/types/domain';
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
          context: { 'service.name': serviceNames },
          request,
        }: {
          context: SuggestionContext;
          request: KibanaRequest;
        }): Promise<SuggestionHandlerResponse<SLOSuggestion>> => {
          const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);

          if (!serviceNames || !serviceNames.length) {
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
                    terms: {
                      'slo.groupings.service.name': serviceNames,
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

          const itemsByService = new Map<string, AttachmentItem<SLOSuggestion>[]>();

          // TODO: remove all casting and any
          for (const doc of results.hits.hits) {
            const src = doc._source;
            if (!src) continue;
            const svcName = (src.slo.groupings as { service: { name: string } }).service.name;

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

            const item: AttachmentItem<SLOSuggestion> = {
              description: `SLO "${payload.name}" is ${payload.summary.status} for the service "${svcName}"`,
              payload,
              attachment: {
                type: AttachmentType.persistableState,
                persistableStateAttachmentTypeId: '.page',
                persistableStateAttachmentState: {
                  type: 'slo_history',
                  url: {
                    pathAndQuery: sloPaths.sloDetailsHistory({
                      id: payload.id,
                      instanceId: payload.instanceId,
                    }),
                    label: payload.name,
                    actionLabel: i18n.translate('xpack.slo.addToCase.caseAttachmentLabel', {
                      defaultMessage: 'Go to SLO history',
                    }),
                    iconType: 'metricbeatApp',
                  },
                },
              },
            };

            const existing = itemsByService.get(svcName);
            if (existing) {
              existing.push(item);
            } else {
              itemsByService.set(svcName, [item]);
            }
          }

          const suggestions = Array.from(itemsByService.entries()).flatMap(([svcName, data]) =>
            data.map((item) => ({
              id: `${item.payload.id}-${item.payload.instanceId}`,
              componentId: 'slo',
              data: [item],
            }))
          );

          return { suggestions };
        },
      },
    },
  };
}

export const registerSloSuggestion = ({
  attachmentFramework,
  coreStart,
  logger,
}: {
  attachmentFramework: AttachmentFramework;
  coreStart: CoreStart;
  logger: Logger;
}) => {
  attachmentFramework.registerSuggestion(getSLOByServiceName(coreStart, logger));
};
