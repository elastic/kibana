/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import dedent from 'dedent';
import {
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
} from '../../common/constants';
import { OBSERVABILITY_GET_ALERTS_TOOL_ID } from '../tools/get_alerts/get_alerts';

export const OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID = 'observability.error';

const errorSchema = z
  .object({
    service: z
      .object({
        name: z.string(),
        environment: z.string().optional(),
        language: z.string().optional(),
        runtime_name: z.string().optional(),
        runtime_version: z.string().optional(),
      })
      .optional(),
    transaction_name: z.string().optional(),
    transaction_id: z.string().optional(),
    error_id: z.string().optional(),
    trace_id: z.string().optional(),
    span_id: z.string().optional(),
    error_grouping_key: z.string().optional(),
    occurred_at: z.string().optional(),
    log_stacktrace: z.string().optional(),
    exception_stacktrace: z.string().optional(),
  })
  .refine((data) => Boolean(data.error_id || data.error_grouping_key), {
    message: 'error_id or error_grouping_key is required',
  })
  .refine((data) => (data.error_grouping_key ? Boolean(data?.service?.name) : true), {
    message: 'service.name is required when error_grouping_key is provided',
  });

type ErrorData = z.infer<typeof errorSchema>;

export const createErrorAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
    validate: (input) => {
      const parsedResult = errorSchema.safeParse(input);

      if (!parsedResult.success) {
        return { valid: false, error: parsedResult.error.message };
      }

      return { valid: true, data: parsedResult.data };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          const data = attachment.data as unknown as ErrorData;

          const { service } = data ?? {};
          const errorId = data?.error_id;
          const errorGroupingKey = data?.error_grouping_key;
          const traceId = data?.trace_id;
          const spanId = data?.span_id;
          const transactionId = data?.transaction_id;
          const transactionName = data?.transaction_name;
          const logStacktrace = data?.log_stacktrace;
          const exceptionStacktrace = data?.exception_stacktrace;
          const occurredAt = data?.occurred_at;

          const representationParts: string[] = [];

          const providedIds: string[] = [];
          if (errorId) providedIds.push(`error_id=${errorId}`);
          if (errorGroupingKey) providedIds.push(`error_grouping_key=${errorGroupingKey}`);
          if (transactionId) providedIds.push(`transaction_id=${transactionId}`);
          if (traceId) providedIds.push(`trace_id=${traceId}`);
          if (spanId) providedIds.push(`span_id=${spanId}`);

          if (providedIds.length > 0) {
            representationParts.push(`Provided identifiers: ${providedIds.join(', ')}`);
          }

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
              `The error occurred on the service ${service.name},${runtimeSentence}${languageLabel}`
            );
          }

          if (occurredAt) {
            representationParts.push(`The error occurred at ${occurredAt}`);
          }

          if (transactionName) {
            representationParts.push(`The request it occurred for is ${transactionName}`);
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
      return dedent(`
        The error attachment contains data about an error that occurred in an application. It must include at least one identifier:
        - error_id OR error_grouping_key

        Use identifiers to fetch any missing context necessary to analyze the error.

        Preferred workflow:
          1) If error_id is present: fetch the error document if needed; derive missing fields from it.
          2) If only error_grouping_key is present: fetch recent samples for that group (service.name is required) and choose a representative error_id and continue with step 1.

        Identifiers that may be present and what they allow you to fetch:
        - error_id
        - error_grouping_key
        - transaction_id
        - trace_id
        - span_id

        Use the following tools as needed to enrich the investigation:
        - ${OBSERVABILITY_GET_SERVICES_TOOL_ID}: verify service and environment metadata.
        - ${OBSERVABILITY_GET_ALERTS_TOOL_ID}: retrieve related alerts in the relevant time window.
        - ${OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID}: inspect downstream dependencies and propagation paths.
      `);
    },
    getTools: () => [
      OBSERVABILITY_GET_SERVICES_TOOL_ID,
      OBSERVABILITY_GET_ALERTS_TOOL_ID,
      OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
    ],
  };
};
