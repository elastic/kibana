/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionHandlerResponse } from '@kbn/cases-plugin/common';
import type { SuggestionContext } from '@kbn/cases-plugin/common';
import type { SuggestionType } from '@kbn/cases-plugin/server';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { AttachmentFramework } from '@kbn/cases-plugin/server/attachment_framework/types';
import type { AttachmentItem } from '@kbn/cases-plugin/common/types/domain';
import { SLO_SUGGESTION_COMPONENT_ID } from '../../../common/cases/constants';
import { buildSloHistoryAttachment } from '../../../common/cases/attachments';
import type { SLOSuggestion } from '../../../common/cases/suggestions';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/constants';
import type { EsSummaryDocument } from '../../services/summary_transform_generator/helpers/create_temp_summary';
import { sloPaths } from '../../../common';

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

          logger.debug(
            `Found ${results.hits.hits.length} SLOs for service ${serviceNames.join(', ')}`
          );

          return {
            suggestions: results.hits.hits.map((hit) => {
              const src = hit._source!;
              const svcName = (src.slo?.groupings?.service as { name: string }).name!;

              const item: AttachmentItem<SLOSuggestion> = {
                description: `SLO "${src.slo.name}" is ${src.status} for the service "${svcName}"`,
                payload: {
                  id: src.slo.id,
                  instanceId: src.slo.instanceId,
                },
                attachment: buildSloHistoryAttachment({
                  label: src.slo.name,
                  pathAndQuery: sloPaths.sloDetailsHistory({
                    id: src.slo.id,
                    instanceId: src.slo.instanceId,
                  }),
                }),
              };
              return {
                id: `${item.payload.id}-${item.payload.instanceId}`,
                componentId: SLO_SUGGESTION_COMPONENT_ID,
                data: [item],
              };
            }),
          };
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
