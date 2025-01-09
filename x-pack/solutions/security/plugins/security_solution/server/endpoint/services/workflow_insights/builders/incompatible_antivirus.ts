/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { get as _get } from 'lodash';

import type { DefendInsight } from '@kbn/elastic-assistant-common';

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

import type { SecurityWorkflowInsight } from '../../../../../common/endpoint/types/workflow_insights';
import type { SupportedHostOsType } from '../../../../../common/endpoint/constants';
import type { BuildWorkflowInsightParams } from '.';

import { FILE_EVENTS_INDEX_PATTERN } from '../../../../../common/endpoint/constants';
import {
  ActionType,
  Category,
  SourceType,
  TargetType,
} from '../../../../../common/endpoint/types/workflow_insights';
import { groupEndpointIdsByOS } from '../helpers';

interface FileEventDoc {
  process: {
    code_signature?: {
      subject_name: string;
      trusted: boolean;
    };
    Ext?: {
      code_signature?: {
        subject_name: string;
        trusted: boolean;
      };
    };
  };
}

export async function buildIncompatibleAntivirusWorkflowInsights(
  params: BuildWorkflowInsightParams
): Promise<SecurityWorkflowInsight[]> {
  const currentTime = moment();
  const { defendInsights, request, endpointMetadataService, esClient } = params;
  const { insightType, endpointIds, apiConfig } = request.body;

  const osEndpointIdsMap = await groupEndpointIdsByOS(endpointIds, endpointMetadataService);

  const insightsPromises = defendInsights.map(
    async (defendInsight: DefendInsight): Promise<SecurityWorkflowInsight[]> => {
      const filePaths = Array.from(
        new Set((defendInsight.events ?? []).map((event) => event.value))
      );
      const eventIds = Array.from(new Set((defendInsight.events ?? []).map((event) => event.id)));

      const codeSignaturesHits = (
        await esClient.search<FileEventDoc>({
          index: FILE_EVENTS_INDEX_PATTERN,
          query: {
            bool: {
              must: [
                {
                  terms: {
                    _id: eventIds,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'process.code_signature.trusted': true,
                        },
                      },
                      {
                        term: {
                          'process.Ext.code_signature.trusted': true,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        })
      ).hits.hits;

      const createRemediation = (
        field: string,
        value: string,
        os: string
      ): SecurityWorkflowInsight => {
        return {
          '@timestamp': currentTime,
          // TODO add i18n support
          message: 'Incompatible antiviruses detected',
          category: Category.Endpoint,
          type: insightType,
          source: {
            type: SourceType.LlmConnector,
            id: apiConfig.connectorId,
            // TODO use actual time range when we add support
            data_range_start: currentTime,
            data_range_end: currentTime.clone().add(24, 'hours'),
          },
          target: {
            type: TargetType.Endpoint,
            ids: endpointIds,
          },
          action: {
            type: ActionType.Refreshed,
            timestamp: currentTime,
          },
          value: defendInsight.group,
          metadata: {
            notes: {
              llm_model: apiConfig.model ?? '',
            },
          },
          remediation: {
            exception_list_items: [
              {
                list_id: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
                name: defendInsight.group,
                description: 'Suggested by Security Workflow Insights',
                entries: [
                  {
                    field,
                    operator: 'included' as const,
                    type: 'match' as const,
                    value,
                  },
                ],
                // TODO add per policy support
                tags: ['policy:all'],
                os_types: [os as SupportedHostOsType],
              },
            ],
          },
        };
      };

      return Object.keys(osEndpointIdsMap).flatMap((os): SecurityWorkflowInsight[] => {
        if (codeSignaturesHits.length) {
          return codeSignaturesHits.map((hit) => {
            const extPath = os === 'windows' ? '.Ext' : '';
            const field = `process${extPath}.code_signature`;
            const value = _get(hit, `_source.${field}.subject_name`, 'invalid subject name');
            return createRemediation(field, value, os);
          });
        } else {
          return filePaths.map((filePath) =>
            createRemediation('process.executable.caseless', filePath, os)
          );
        }
      });
    }
  );

  const insightsArr = await Promise.all(insightsPromises);
  return insightsArr.flat();
}
