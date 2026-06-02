/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentTypeDefinition,
  BuiltinAttachmentBoundedTool,
} from '@kbn/agent-builder-server/attachments';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { DEFAULT_PREVIEW_INDEX, SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

export const rulePreviewAttachmentDataSchema = securityAttachmentDataSchema.extend({
  previewId: z.string().min(1).max(1_000),
});

type RulePreviewAttachmentData = z.infer<typeof rulePreviewAttachmentDataSchema>;

interface RulePreviewAlertSource {
  '@timestamp'?: string;
  [ALERT_RULE_UUID]?: string;
  'kibana.alert.rule.name'?: string;
  'kibana.alert.rule.type'?: string;
  [key: string]: unknown;
}

interface RulePreviewAlertsToolResult {
  previewId: string;
  total: number;
  alerts: Array<SearchHit<RulePreviewAlertSource>>;
}

interface RulePreviewAttachmentTypeOptions {
  getAlertCount: (params: {
    previewId: string;
    request: KibanaRequest;
    spaceId: string;
  }) => Promise<number>;
}

const GET_RULE_PREVIEW_ALERTS_TOOL_ID = 'get_rule_preview_alerts';
const DEFAULT_ALERTS_SIZE = 25;
const MAX_ALERTS_SIZE = 100;

const getRulePreviewAlertsToolSchema = z.object({
  previewId: z
    .string()
    .min(1)
    .max(1_000)
    .describe(
      'The preview ID of the security rule preview attachment to fetch alerts for, as shown in the rule preview attachment.'
    ),
  size: z
    .number()
    .int()
    .min(1)
    .max(MAX_ALERTS_SIZE)
    .optional()
    .describe(`Maximum number of preview alerts to fetch. Defaults to ${DEFAULT_ALERTS_SIZE}.`),
});

const isRulePreviewAttachmentData = (data: unknown): data is RulePreviewAttachmentData => {
  return rulePreviewAttachmentDataSchema.safeParse(data).success;
};

export const getRulePreviewAlertCount = async ({
  esClient,
  previewId,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  previewId: string;
  spaceId: string;
}): Promise<number> => {
  const result = await esClient.count({
    index: `${DEFAULT_PREVIEW_INDEX}-${spaceId}`,
    query: {
      bool: {
        filter: [
          {
            term: {
              [ALERT_RULE_UUID]: previewId,
            },
          },
        ],
      },
    },
  });

  return result.count;
};

const getRulePreviewAlertsTool = (): BuiltinAttachmentBoundedTool<
  typeof getRulePreviewAlertsToolSchema
> => ({
  id: GET_RULE_PREVIEW_ALERTS_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Fetch the preview alerts generated for a security rule preview. Provide the previewId shown in the rule preview attachment.',
  schema: getRulePreviewAlertsToolSchema,
  handler: async ({ previewId, size = DEFAULT_ALERTS_SIZE }, context) => {
    const searchResult = await context.esClient.asCurrentUser.search<RulePreviewAlertSource>({
      index: `${DEFAULT_PREVIEW_INDEX}-${context.spaceId}`,
      size,
      query: {
        bool: {
          filter: [
            {
              term: {
                [ALERT_RULE_UUID]: previewId,
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
    });

    const total =
      typeof searchResult.hits.total === 'number'
        ? searchResult.hits.total
        : searchResult.hits.total?.value ?? 0;

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            previewId,
            total,
            alerts: searchResult.hits.hits,
          } satisfies RulePreviewAlertsToolResult,
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => {
    const result = toolReturn.results[0];
    if (!result || !isOtherResult<RulePreviewAlertsToolResult>(result)) {
      return undefined;
    }

    return [
      {
        ...result,
        data: {
          summary: `Fetched ${result.data.alerts.length} of ${result.data.total} preview alerts for ${result.data.previewId}`,
          previewId: result.data.previewId,
          total: result.data.total,
        },
      },
    ];
  },
});

export const createRulePreviewAttachmentType = ({
  getAlertCount,
}: RulePreviewAttachmentTypeOptions): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.rulePreview,
    validate: (input) => {
      const parseResult = rulePreviewAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment: Attachment<string, unknown>, context) => {
      const data = attachment.data;
      if (!isRulePreviewAttachmentData(data)) {
        throw new Error(`Invalid rule preview attachment data for attachment ${attachment.id}`);
      }

      return {
        getRepresentation: async () => {
          const alertCount = await getAlertCount({
            previewId: data.previewId,
            request: context.request,
            spaceId: context.spaceId,
          });

          return {
            type: 'text' as const,
            value: [
              `Security rule preview ID: ${data.previewId}.`,
              '',
              '## Rule Preview Metrics',
              '',
              `- Generated alerts: ${alertCount}`,
            ].join('\n'),
          };
        },
        getBoundedTools: () => [getRulePreviewAlertsTool()],
      };
    },
    getTools: () => [],
    getAgentDescription: () =>
      `A security rule preview attachment contains a preview ID and high-level metrics for generated preview alerts. Use ${GET_RULE_PREVIEW_ALERTS_TOOL_ID} with the attachment's preview ID to fetch the alert documents before analyzing whether the rule preview behaved as expected.`,
    isReadonly: true,
  };
};
