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

const buildPayload = (src: EsSummaryDocument): SLOSuggestion => ({
  id: src.slo.id,
  name: src.slo.name,
  instanceId: src.slo.instanceId,
  summary: { status: src.status },
});

const buildItem = (svcName: string, payload: SLOSuggestion): AttachmentItem<SLOSuggestion> => ({
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
});

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

          const itemsByService = results.hits.hits.reduce<
            Record<string, AttachmentItem<SLOSuggestion>[]>
          >((acc, { _source: src }) => {
            if (!src) return acc;
            const svcName = (src.slo?.groupings?.service as { name: string }).name;
            if (!svcName) return acc;

            const payload = buildPayload(src);
            const item = buildItem(svcName, payload);

            (acc[svcName] ??= []).push(item);
            return acc;
          }, {});

          const suggestions = Object.values(itemsByService).flatMap((items) =>
            items.map((item) => ({
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
