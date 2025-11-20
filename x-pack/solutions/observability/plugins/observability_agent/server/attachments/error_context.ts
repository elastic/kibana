/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import {
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
} from '../../common/constants';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID } from '../tools/get_alerts/get_alerts';
import { OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID } from '../tools/get_data_sources/get_data_sources';

export const OBSERVABILITY_ERROR_CONTEXT_ATTACHMENT_TYPE_ID = 'observability.error_context';

const MAX_STACKTRACE_LENGTH = 10_000;

const errorContextSchema = z
  .object({
    service: z
      .object({
        name: z.string(),
        environment: z.string().optional(),
        language: z.string().optional(),
        runtime_name: z.string().optional(),
        runtime_version: z.string().optional(),
      })
      .partial({ environment: true, language: true, runtime_name: true, runtime_version: true })
      .optional(),
    transaction_name: z.string().optional(),
    error_id: z.string().optional(),
    occurred_at: z.string().optional(),
    log_stacktrace: z.string().optional(),
    exception_stacktrace: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data?.service?.name ||
          data.transaction_name ||
          data.log_stacktrace ||
          data.exception_stacktrace
      ),
    {
      message:
        'At least one of service.name, transaction_name, log_stacktrace, or exception_stacktrace must be present to analyze the error',
    }
  );

type ErrorContextData = z.infer<typeof errorContextSchema>;

function truncate(text?: string): string | undefined {
  if (!text) return text;
  if (text.length <= MAX_STACKTRACE_LENGTH) return text;
  return `${text.slice(0, MAX_STACKTRACE_LENGTH)}\n[truncated]`;
}

export const createErrorContextAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: OBSERVABILITY_ERROR_CONTEXT_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parse = errorContextSchema.safeParse({
        ...(typeof input === 'object' ? input : {}),
        log_stacktrace: truncate((input as any)?.log_stacktrace),
        exception_stacktrace: truncate((input as any)?.exception_stacktrace),
      });

      if (!parse.success) {
        return { valid: false, error: parse.error.message };
      }

      return { valid: true, data: parse.data };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          const data = attachment.data as unknown as ErrorContextData;

          const { service } = data ?? {};
          const transactionName = data?.transaction_name;
          const logStacktrace = data?.log_stacktrace;
          const exceptionStacktrace = data?.exception_stacktrace;
          const occurredAt = data?.occurred_at;

          const representationParts: string[] = [];

          if (service?.name) {
            const runtimeLabel =
              service.runtime_name || service.runtime_version
                ? `${service.runtime_name ?? ''}${
                    service.runtime_name && service.runtime_version ? ' ' : ''
                  }${service.runtime_version ?? ''}`.trim()
                : '';

            const languageLabel = service.language ? ` written in ${service.language}` : '';

            const runtimeSentence = runtimeLabel ? ` which is a ${runtimeLabel} service` : '';

            representationParts.push(
              `The error occurred on the service ${service.name},${runtimeSentence}${languageLabel}.`
            );
          }

          if (occurredAt) {
            representationParts.push(`The error occurred at ${occurredAt}.`);
          }

          if (transactionName) {
            representationParts.push(`The request it occurred for is called ${transactionName}.`);
          }

          if (logStacktrace) {
            representationParts.push(`The log stacktrace:\n${logStacktrace}`);
          }

          if (exceptionStacktrace) {
            representationParts.push(`The exception stacktrace:\n${exceptionStacktrace}`);
          }

          return {
            type: 'text',
            value: representationParts.join('\n'),
          };
        },
      };
    },
    getAgentDescription: () => {
      return [
        'You are an SRE. Troubleshoot the application error and propose actions.',
        '',
        'Goal:',
        '- Explain what the error means and what could have caused it.',
        '- Use any provided service/runtime/language/version and transaction details.',
        '- Use available stacktraces (log and/or exception) to identify likely failure points; cite key frames only.',
        '',
        'Required workflow (in order):',
        `1) Confirm service context:\n   - Tool: ${OBSERVABILITY_GET_SERVICES_TOOL_ID} - verify service exists, environment and basic metadata.`,
        `2) Review data sources for the service/time window:\n   - Tool: ${OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID} - confirm index coverage and scope.`,
        `3) Check related alerts (last 1-6h) for this service/environment:\n   - Tool: ${OBSERVABILITY_GET_ALERTS_TOOL_ID} - note alert types, severities, rule names.`,
        `4) Map downstream dependencies (if relevant):\n   - Tool: ${OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID} - identify likely propagation paths.`,
        '',
        'Guidelines:',
        '- Do not guess; if information is missing, state what to fetch next.',
        '- Cite tool results explicitly as field:value.',
        '- Consider both log and exception stacktraces when present; prefer frames pointing to application code or failing dependencies.',
        '',
        'Respond with:',
        '- Summary: one paragraph of likely cause(s).',
        '- Impact: scope, severity, affected endpoints/users.',
        '- Evidence: brief bullets citing tool outputs (field:value) and key stack frames.',
        '- Next steps: priority-ordered actions.',
      ].join('\n');
    },
    getTools: () => [
      OBSERVABILITY_GET_SERVICES_TOOL_ID,
      OBSERVABILITY_GET_DATA_SOURCES_TOOL_ID,
      OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
      OBSERVABILITY_GET_ALERTS_TOOL_ID,
    ],
  };
};
