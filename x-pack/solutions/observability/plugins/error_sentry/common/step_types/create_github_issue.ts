/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

export const CreateGithubIssueStepTypeId = 'error-sentry.createGithubIssue' as const;

export const InputSchema = z.object({
  title: z.string().describe('Issue title.'),
  body: z.string().describe('Issue body (Markdown).'),
  labels: z.array(z.string()).optional().describe('Labels to apply to the issue.'),
  owner: z
    .string()
    .optional()
    .describe('Repository owner. Defaults to the plugin config value.'),
  repo: z
    .string()
    .optional()
    .describe('Repository name. Defaults to the plugin config value.'),
});

export const OutputSchema = z.object({
  created: z.boolean().describe('Whether an issue was created.'),
  skipped: z.boolean().describe('True when creation was skipped (e.g. no token configured).'),
  issueNumber: z.number().optional(),
  issueUrl: z.string().optional(),
});

export type CreateGithubIssueInputSchema = typeof InputSchema;
export type CreateGithubIssueOutputSchema = typeof OutputSchema;

export const createGithubIssueCommonDefinition: CommonStepDefinition<
  CreateGithubIssueInputSchema,
  CreateGithubIssueOutputSchema
> = {
  id: CreateGithubIssueStepTypeId,
  category: StepCategory.External,
  label: i18n.translate('errorSentry.createGithubIssue.label', {
    defaultMessage: 'Create GitHub issue',
  }),
  description: i18n.translate('errorSentry.createGithubIssue.description', {
    defaultMessage: 'Creates a GitHub issue in the configured backlog repository.',
  }),
  documentation: {
    details: i18n.translate('errorSentry.createGithubIssue.documentation.details', {
      defaultMessage:
        'Creates an issue via the GitHub REST API. The token, owner and repo come from the errorSentry plugin config; owner/repo can be overridden per step. When no token is configured the step is a no-op and reports {ref}.',
      values: { ref: '`{{ steps.<name>.output.skipped }}`' },
    }),
    examples: [
      `## Create an issue for a detected pattern
\`\`\`yaml
- name: create_issue
  type: ${CreateGithubIssueStepTypeId}
  with:
    title: "[Kibana Log] {{ foreach.item.key }}"
    body: "Occurrences: {{ foreach.item.docCount }}"
    labels:
      - error-category
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
