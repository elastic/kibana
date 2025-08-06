/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  type SuggestionContext,
  type SuggestionResponse,
} from '@kbn/cases-plugin/common';
import type { SuggestionType } from '@kbn/cases-plugin/server';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { sloPaths } from '../../../common';
import type { SLOSuggestion } from '../../../common/cases/suggestions';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/constants';
import type { EsSummaryDocument } from '../../services/summary_transform_generator/helpers/create_temp_summary';

export function getSLOByServiceName(
  coreStart: CoreStart,
  logger: Logger
): SuggestionType<SLOSuggestion> {
  return {
    id: 'sloByServiceName',
    attachmentId: '.page',
    owner: 'observability',
    tools: {
      searchSLOByServiceName: {
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
    },
    handlers: {
      searchSLOByServiceName: async ({
        context: { 'service.name': serviceName },
        request,
      }: {
        context: SuggestionContext;
        request: KibanaRequest;
      }): Promise<SuggestionResponse<SLOSuggestion>> => {
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
                    'slo.groupings.service.name': serviceName,
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
          return {
            id: doc._source!.slo.id,
            instanceId: doc._source!.slo.instanceId,
            name: doc._source!.slo.name,
            spaceId: doc._source!.spaceId,
            status: doc._source!.status,
          };
        });

        return {
          suggestions: [
            {
              id: 'example',
              description: `Found ${suggestions.length} SLOs linked to service "${serviceName}"`,
              data: suggestions.map((suggestion) => ({
                description: `SLO "${suggestion.name}" is ${suggestion.status}`,
                payload: {
                  id: suggestion.id,
                  name: suggestion.name,
                  instanceId: suggestion.instanceId,
                },
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
  };
}
