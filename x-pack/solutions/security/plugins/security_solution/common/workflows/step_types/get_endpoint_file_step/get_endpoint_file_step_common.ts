/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { MAX_ALERT_ID_LENGTH, MAX_WORKFLOW_MESSAGE_LENGTH } from '../common/constants';

const MAX_ENDPOINT_ID_LENGTH = 256;
const MAX_CASE_ID_LENGTH = 256;
const MAX_FILE_PATH_LENGTH = 4096;
const MAX_RESPONSE_ACTION_ITEMS = 50;

export const GetEndpointFileStepId = 'security.getEndpointFile' as const;

const endpointIdSchema = z.string().min(1).max(MAX_ENDPOINT_ID_LENGTH);
const alertIdSchema = z.string().min(1).max(MAX_ALERT_ID_LENGTH);
const caseIdSchema = z.string().min(1).max(MAX_CASE_ID_LENGTH);

export const getEndpointFileInputSchema = z.object({
  endpoint_id: endpointIdSchema.describe('The Elastic Agent ID for the endpoint host'),
  file_path: z.string().min(1).max(MAX_FILE_PATH_LENGTH).describe('The full path to retrieve'),
  alert_ids: z
    .union([alertIdSchema, z.array(alertIdSchema).min(1).max(MAX_RESPONSE_ACTION_ITEMS)])
    .optional()
    .describe('Optional alert ID or IDs to associate with the response action'),
  case_ids: z
    .union([caseIdSchema, z.array(caseIdSchema).min(1).max(MAX_RESPONSE_ACTION_ITEMS)])
    .optional()
    .describe('Optional case ID or IDs to associate with the response action'),
  comment: z
    .string()
    .max(MAX_WORKFLOW_MESSAGE_LENGTH)
    .optional()
    .describe('Optional comment stored with the response action'),
});

export const getEndpointFileOutputSchema = z.object({
  action_id: z.string(),
  endpoint_id: endpointIdSchema,
  download_uri: z.string(),
  status: z.literal('successful'),
  completed_at: z.string().optional(),
  zip_size: z.number().int().nonnegative().optional(),
  contents: z.array(
    z.object({
      path: z.string().optional(),
      sha256: z.string().optional(),
      size: z.number().int().nonnegative().optional(),
      file_name: z.string().optional(),
      type: z.string().optional(),
    })
  ),
});

export const getEndpointFileStepCommonDefinition: BaseStepDefinition<
  typeof getEndpointFileInputSchema,
  typeof getEndpointFileOutputSchema
> = {
  id: GetEndpointFileStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.getEndpointFile.label', {
    defaultMessage: 'Get Endpoint File',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.getEndpointFile.description',
    {
      defaultMessage:
        'Request a file from an Elastic Defend host and wait for the download to be ready.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: getEndpointFileInputSchema,
  outputSchema: getEndpointFileOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.getEndpointFile.documentation.details',
      {
        defaultMessage:
          'Creates a get-file response action for one Elastic Defend endpoint, polls the action details until completion, and returns the relative download URI for the password-protected zip. Elastic Defend zip files use the password "elastic".',
      }
    ),
    examples: [
      `## Retrieve a quarantined file
\`\`\`yaml
- name: get_endpoint_file
  type: ${GetEndpointFileStepId}
  with:
    endpoint_id: "{{ variables.endpoint_id }}"
    file_path: "{{ variables.quarantined_file_path }}"
    alert_ids: "{{ variables.alert_id }}"
    comment: "Retrieve quarantined file for malware analysis"
\`\`\``,
    ],
  },
};
