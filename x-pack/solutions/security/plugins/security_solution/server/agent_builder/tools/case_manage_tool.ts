/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const caseManageSchema = z.object({
  action: z
    .enum(['create', 'update', 'add_comment', 'attach_alerts', 'get', 'change_status'])
    .describe(
      'The action to perform on the case: create a new case, update an existing case, add a comment, attach alerts, get case details, or change case status'
    ),
  case_id: z
    .string()
    .optional()
    .describe(
      'The ID of the case to operate on. Required for update, add_comment, attach_alerts, get, and change_status actions.'
    ),
  title: z
    .string()
    .max(256)
    .optional()
    .describe('The title for the case. Required when creating a new case.'),
  description: z
    .string()
    .max(30000)
    .optional()
    .describe('The description for the case. Used when creating or updating a case.'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Tags to associate with the case for categorization and filtering.'),
  alert_ids: z
    .array(z.string().max(255))
    .max(100)
    .optional()
    .describe(
      'Array of alert IDs to attach to the case. Used with the attach_alerts action.'
    ),
  comment: z
    .string()
    .max(30000)
    .optional()
    .describe('Comment text to add to the case. Used with the add_comment action.'),
  status: z
    .enum(['open', 'in-progress', 'closed'])
    .optional()
    .describe(
      'The status to set on the case. Used with the change_status action.'
    ),
  severity: z
    .enum(['low', 'medium', 'high', 'critical'])
    .optional()
    .describe('The severity level for the case. Used when creating or updating a case.'),
});

export const SECURITY_CASE_MANAGE_TOOL_ID = securityTool('case_manage');

const SECURITY_SOLUTION_OWNER = 'securitySolution';

export const caseManageTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof caseManageSchema> => {
  return {
    id: SECURITY_CASE_MANAGE_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Create, update, and manage security cases. Supports creating cases, updating case details, attaching alerts, adding comments, and changing case status. Uses the Cases API through plugin contracts.',
    schema: caseManageSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status !== 'available') {
            return availability;
          }

          // Verify the Cases plugin is available
          const [, startPlugins] = await core.getStartServices();
          if (!startPlugins.cases) {
            return {
              status: 'unavailable' as const,
              reason: 'Cases plugin is not available',
            };
          }

          return { status: 'available' as const };
        } catch (error) {
          return {
            status: 'unavailable' as const,
            reason: `Failed to check cases availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async (
      {
        action,
        case_id: caseId,
        title,
        description,
        tags: caseTags,
        alert_ids: alertIds,
        comment,
        status,
        severity,
      },
      { request, spaceId, esClient }
    ) => {
      logger.debug(
        `${SECURITY_CASE_MANAGE_TOOL_ID} tool called with action: ${action}${
          caseId ? `, caseId: ${caseId}` : ''
        }`
      );

      try {
        const [, startPlugins] = await core.getStartServices();

        if (!startPlugins.cases) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: 'Cases plugin is not available',
                },
              },
            ],
          };
        }

        const casesClient = await startPlugins.cases.getCasesClientWithRequest(request);

        switch (action) {
          case 'create': {
            if (!title) {
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.error,
                    data: {
                      message: 'Title is required when creating a case',
                    },
                  },
                ],
              };
            }

            const createdCase = await casesClient.cases.create({
              title,
              description: description ?? '',
              tags: caseTags ?? [],
              severity: severity ?? 'low',
              owner: SECURITY_SOLUTION_OWNER,
              connector: {
                id: 'none',
                name: 'none',
                type: '.none',
                fields: null,
              },
              settings: {
                syncAlerts: true,
              },
            });

            logger.debug(`Successfully created case "${title}" with ID: ${createdCase.id}`);

            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    case_id: createdCase.id,
                    title: createdCase.title,
                    status: createdCase.status,
                    severity: createdCase.severity,
                    url: `/app/security/cases/${createdCase.id}`,
                    message: `Case "${title}" created successfully.`,
                  },
                },
              ],
            };
          }

          case 'update': {
            if (!caseId) {
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.error,
                    data: {
                      message: 'case_id is required when updating a case',
                    },
                  },
                ],
              };
            }

            // Fetch the current case to get its version
            const currentCase = await casesClient.cases.get({ id: caseId });

            const updatedCases = await casesClient.cases.update({
              cases: [
                {
                  id: caseId,
                  version: currentCase.version,
                  ...(title && { title }),
                  ...(description && { description }),
                  ...(caseTags && { tags: caseTags }),
                  ...(severity && { severity }),
                },
              ],
            });

            const updatedCase = updatedCases[0];

            logger.debug(`Successfully updated case ${caseId}`);

            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    case_id: updatedCase.id,
                    title: updatedCase.title,
                    status: updatedCase.status,
                    severity: updatedCase.severity,
                    url: `/app/security/cases/${updatedCase.id}`,
                    message: `Case "${updatedCase.title}" updated successfully.`,
                  },
                },
              ],
            };
          }

          case 'add_comment': {
            if (!caseId) {
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.error,
                    data: {
                      message: 'case_id is required when adding a comment',
                    },
                  },
                ],
              };
            }

            if (!comment) {
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.error,
                    data: {
                      message: 'comment is required when adding a comment to a case',
                    },
                  },
                ],
              };
            }

            const commentResult = await casesClient.attachments.add({
              caseId,
              comment: {
                type: 'user' as const,
                comment,
                owner: SECURITY_SOLUTION_OWNER,
              },
            });

            logger.debug(`Successfully added comment to case ${caseId}`);

            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    case_id: commentResult.id,
                    total_comments: commentResult.totalComment,
                    url: `/app/security/cases/${caseId}`,
                    message: `Comment added to case "${commentResult.title}" successfully.`,
                  },
                },
              ],
            };
          }

          case 'attach_alerts': {
            if (!caseId) {
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.error,
                    data: {
                      message: 'case_id is required when attaching alerts',
                    },
                  },
                ],
              };
            }

            if (!alertIds || alertIds.length === 0) {
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.error,
                    data: {
                      message: 'alert_ids is required and must not be empty when attaching alerts',
                    },
                  },
                ],
              };
            }

            // Query alert documents to get rule info for proper case attachments
            const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
            const alertsResponse = await esClient.asCurrentUser.search({
              index: alertsIndex,
              ignore_unavailable: true,
              allow_no_indices: true,
              size: alertIds.length,
              _source: ['kibana.alert.rule.uuid', 'kibana.alert.rule.name'],
              query: { bool: { filter: [{ terms: { _id: alertIds } }] } },
            });

            const alertRuleMap = new Map<string, { id: string; name: string }>();
            for (const hit of alertsResponse.hits.hits) {
              if (hit._id && hit._source) {
                const src = hit._source as Record<string, unknown>;
                const kibanaAlert = src['kibana.alert.rule.uuid'] as string | undefined;
                const kibanaName = src['kibana.alert.rule.name'] as string | undefined;
                alertRuleMap.set(hit._id, {
                  id: kibanaAlert ?? 'unknown',
                  name: kibanaName ?? 'unknown',
                });
              }
            }

            const alertAttachments = alertIds.map((alertId) => {
              const ruleInfo = alertRuleMap.get(alertId) ?? { id: 'unknown', name: 'unknown' };
              return {
                type: 'alert' as const,
                alertId,
                index: alertsIndex,
                rule: ruleInfo,
                owner: SECURITY_SOLUTION_OWNER,
              };
            });

            await casesClient.attachments.bulkCreate({
              caseId,
              attachments: alertAttachments,
            });

            logger.debug(
              `Successfully attached ${alertIds.length} alerts to case ${caseId}`
            );

            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    case_id: caseId,
                    attached_alerts: alertIds.length,
                    url: `/app/security/cases/${caseId}`,
                    message: `${alertIds.length} alert(s) attached to case successfully.`,
                  },
                },
              ],
            };
          }

          case 'get': {
            if (!caseId) {
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.error,
                    data: {
                      message: 'case_id is required when getting case details',
                    },
                  },
                ],
              };
            }

            const caseDetails = await casesClient.cases.get({ id: caseId });

            logger.debug(`Successfully retrieved case ${caseId}`);

            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    case_id: caseDetails.id,
                    title: caseDetails.title,
                    description: caseDetails.description,
                    status: caseDetails.status,
                    severity: caseDetails.severity,
                    tags: caseDetails.tags,
                    total_comments: caseDetails.totalComment,
                    total_alerts: caseDetails.totalAlerts,
                    created_at: caseDetails.created_at,
                    updated_at: caseDetails.updated_at,
                    created_by: caseDetails.created_by,
                    url: `/app/security/cases/${caseDetails.id}`,
                  },
                },
              ],
            };
          }

          case 'change_status': {
            if (!caseId) {
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.error,
                    data: {
                      message: 'case_id is required when changing case status',
                    },
                  },
                ],
              };
            }

            if (!status) {
              return {
                results: [
                  {
                    tool_result_id: getToolResultId(),
                    type: ToolResultType.error,
                    data: {
                      message: 'status is required when changing case status',
                    },
                  },
                ],
              };
            }

            // Fetch the current case to get its version
            const existingCase = await casesClient.cases.get({ id: caseId });

            const statusUpdatedCases = await casesClient.cases.update({
              cases: [
                {
                  id: caseId,
                  version: existingCase.version,
                  status,
                },
              ],
            });

            const statusUpdatedCase = statusUpdatedCases[0];

            logger.debug(
              `Successfully changed status of case ${caseId} to ${status}`
            );

            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.other,
                  data: {
                    case_id: statusUpdatedCase.id,
                    title: statusUpdatedCase.title,
                    previous_status: existingCase.status,
                    new_status: statusUpdatedCase.status,
                    url: `/app/security/cases/${statusUpdatedCase.id}`,
                    message: `Case "${statusUpdatedCase.title}" status changed from "${existingCase.status}" to "${status}".`,
                  },
                },
              ],
            };
          }

          default:
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.error,
                  data: {
                    message: `Unknown action: ${action}`,
                  },
                },
              ],
            };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${SECURITY_CASE_MANAGE_TOOL_ID} tool: ${errorMessage}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error managing case: ${errorMessage}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'cases', 'incident-management'],
  };
};
