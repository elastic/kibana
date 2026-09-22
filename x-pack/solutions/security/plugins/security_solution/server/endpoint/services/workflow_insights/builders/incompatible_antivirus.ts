/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { posix, win32 } from 'path';

import moment from 'moment';
import { uniqBy } from 'lodash';

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type {
  DefendInsight,
  SecurityWorkflowInsight,
} from '../../../../../common/endpoint/types/workflow_insights';

import type { SupportedHostOsType } from '../../../../../common/endpoint/constants';
import type { BuildWorkflowInsightParams } from '.';

import { FILE_EVENTS_INDEX_PATTERN } from '../../../../../common/endpoint/constants';
import { MAX_NAME_LENGTH } from '../../../../../common/api/endpoint/workflow_insights/workflow_insights';
import {
  WorkflowInsightActionType,
  WorkflowInsightCategory,
  WorkflowInsightSourceType,
  WorkflowInsightTargetType,
} from '../../../../../common/endpoint/types/workflow_insights';
import { prefixIndexPatternsWithCcs } from '../../../utils/ccs_utils';
import type { FileEventDoc } from '../helpers';
import { getValidCodeSignature, groupEndpointIdsByOS } from '../helpers';

const getFileBasename = (filePath: string, os: string): string => {
  const basename = os === 'windows' ? win32.basename(filePath) : posix.basename(filePath);
  return basename.length > 0 ? basename : filePath;
};

const clampToMaxNameLength = (name: string): string => name.slice(0, MAX_NAME_LENGTH);

const deriveRemediationName = (
  filePath: string,
  os: string,
  processName?: string
): string | undefined => {
  if (typeof processName === 'string' && processName) {
    const nameFromProcess = clampToMaxNameLength(processName);
    if (nameFromProcess.length > 0) {
      return nameFromProcess;
    }
  }
  // filePath is unbounded (Windows long paths can reach ~32k chars), so clamp unconditionally
  const nameFromPath = clampToMaxNameLength(getFileBasename(filePath, os));
  return nameFromPath.length > 0 ? nameFromPath : undefined;
};

export async function buildIncompatibleAntivirusWorkflowInsights(
  params: BuildWorkflowInsightParams
): Promise<SecurityWorkflowInsight[]> {
  const currentTime = moment();
  const { defendInsights, options, endpointMetadataService, esClient, ccsEnabled } = params;
  const { insightType, endpointIds, connectorId, model } = options;

  const osEndpointIdsMap = await groupEndpointIdsByOS(endpointIds, endpointMetadataService);

  const insightsPromises = defendInsights.map(
    async (defendInsight: DefendInsight): Promise<SecurityWorkflowInsight[]> => {
      // A non-string or blank path derives no name, and the artifact validator requires minLength: 1
      const uniqueFilePathsInsights = uniqBy(defendInsight.events, 'value').filter(
        (event) => typeof event.value === 'string' && event.value.trim().length > 0
      );
      const eventIds = Array.from(new Set(uniqueFilePathsInsights.map((event) => event.id)));

      const codeSignaturesHits = (
        await esClient.search<FileEventDoc>({
          index: prefixIndexPatternsWithCcs(FILE_EVENTS_INDEX_PATTERN, ccsEnabled),
          size: eventIds.length,
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
        filePath: string,
        os: string,
        processName?: string,
        signatureField?: string,
        signatureValue?: string
      ): SecurityWorkflowInsight | undefined => {
        const remediationName = deriveRemediationName(filePath, os, processName);
        if (!remediationName) {
          return undefined;
        }
        return {
          '@timestamp': currentTime,
          // TODO add i18n support
          message: 'Incompatible antiviruses detected',
          category: WorkflowInsightCategory.enum.endpoint,
          type: insightType,
          source: {
            type: WorkflowInsightSourceType.enum['llm-connector'],
            id: connectorId ?? '',
            // TODO use actual time range when we add support
            data_range_start: currentTime,
            data_range_end: currentTime.clone().add(24, 'hours'),
          },
          target: {
            type: WorkflowInsightTargetType.enum.endpoint,
            ids: endpointIds,
          },
          action: {
            type: WorkflowInsightActionType.enum.refreshed,
            timestamp: currentTime,
          },
          value: `${filePath}${signatureValue ? ` ${signatureValue}` : ''}`,
          metadata: {
            notes: {
              llm_model: model ?? '',
            },
            display_name: remediationName,
          },
          remediation: {
            exception_list_items: [
              {
                list_id: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
                name: remediationName,
                description: 'Suggested by Automatic Troubleshooting',
                entries: [
                  {
                    field: 'process.executable.caseless',
                    operator: 'included' as const,
                    type: 'match' as const,
                    value: filePath,
                  },
                  ...(signatureField && signatureValue
                    ? [
                        {
                          field: signatureField,
                          operator: 'included' as const,
                          type: 'match' as const,
                          value: signatureValue,
                        },
                      ]
                    : []),
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
        return uniqueFilePathsInsights.flatMap((insight): SecurityWorkflowInsight[] => {
          const { value: filePath, id } = insight;

          if (codeSignaturesHits.length) {
            const codeSignatureSearchHit = codeSignaturesHits.find((hit) => hit._id === id);

            if (codeSignatureSearchHit) {
              const processName = codeSignatureSearchHit._source?.process?.name;
              const signature = getValidCodeSignature(os, codeSignatureSearchHit._source);
              const remediation = signature
                ? createRemediation(filePath, os, processName, signature.field, signature.value)
                : createRemediation(filePath, os, processName);
              return remediation ? [remediation] : [];
            }
          }

          const remediation = createRemediation(filePath, os);
          return remediation ? [remediation] : [];
        });
      });
    }
  );

  const insightsArr = await Promise.all(insightsPromises);
  return insightsArr.flat();
}
