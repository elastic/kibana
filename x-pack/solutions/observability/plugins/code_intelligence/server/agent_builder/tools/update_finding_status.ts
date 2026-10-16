/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import {
  createErrorResult,
  createOtherResult,
  type BuiltinToolDefinition,
} from '@kbn/agent-builder-server';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';

import { FINDING_STATUSES, MAX_FINDING_REVIEW_NOTE_LENGTH } from '../../../common/finding_filters';
import { updateFindingStatus } from '../../findings_service';
import {
  CODE_INTELLIGENCE_TOOL_IDS,
  CODE_INTELLIGENCE_TOOL_TAGS,
  type CodeIntelligenceToolDependencies,
} from './types';

const schema = z.object({
  id: z.string().min(1).max(512),
  status: z.enum(FINDING_STATUSES),
  note: z.string().min(1).max(MAX_FINDING_REVIEW_NOTE_LENGTH),
});

export const createUpdateFindingStatusTool = ({
  findingsIndex,
}: CodeIntelligenceToolDependencies): BuiltinToolDefinition<typeof schema> => ({
  id: CODE_INTELLIGENCE_TOOL_IDS.updateFindingStatus,
  type: ToolType.builtin,
  description:
    'Updates the review status of a Code Intelligence finding. Call only after investigating: verified means the line really exposes sensitive data, invalid means it is a false alarm, and open reopens it. The required note states the reason in 1 or 2 sentences and must never contain the secret value itself. The user confirms every update.',
  schema,
  tags: CODE_INTELLIGENCE_TOOL_TAGS,
  annotations: {
    title: 'Update a Code Intelligence Finding',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.updateFindingStatus.confirmation.title',
        { defaultMessage: 'Update Code Intelligence finding' }
      ),
      message: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.updateFindingStatus.confirmation.message',
        {
          defaultMessage: 'Mark this finding as {status}? Reason: {note}',
          values: { status: toolParams.status, note: toolParams.note },
        }
      ),
      confirm_text: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.updateFindingStatus.confirmation.confirm',
        { defaultMessage: 'Update' }
      ),
      cancel_text: i18n.translate(
        'xpack.codeIntelligence.agentBuilder.updateFindingStatus.confirmation.cancel',
        { defaultMessage: 'Cancel' }
      ),
    }),
  },
  handler: async (input, { esClient }) => {
    const finding = await updateFindingStatus(esClient.asCurrentUser, findingsIndex, input);
    return {
      results: [
        finding === undefined
          ? createErrorResult({
              message: 'Finding was not found.',
              metadata: { code: 'finding_not_found', id: input.id },
            })
          : createOtherResult({ finding }),
      ],
    };
  },
});
