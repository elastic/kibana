/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { PROMPTS } from './prompts';

export function getDefendInsightsOutputSchema({ type }: { type: DefendInsightType }) {
  switch (type) {
    case DefendInsightType.Enum.incompatible_antivirus:
      const antivirusPrompts = PROMPTS.INCOMPATIBLE_ANTIVIRUS;
      return z.object({
        insights: z.array(
          z.object({
            group: z.string().describe(antivirusPrompts.GROUP),
            events: z
              .object({
                id: z.string().describe(antivirusPrompts.EVENTS_ID),
                endpointId: z.string().describe(antivirusPrompts.EVENTS_ENDPOINT_ID),
                value: z.string().describe(antivirusPrompts.EVENTS_VALUE),
              })
              .array()
              .describe(antivirusPrompts.EVENTS),
          })
        ),
      });
    case DefendInsightType.Enum.policy_response_failure:
      const policyResponsePrompts = PROMPTS.POLICY_RESPONSE_FAILURE;
      return z.object({
        insights: z.array(
          z.object({
            group: z.string().describe(policyResponsePrompts.GROUP),
            events: z
              .object({
                id: z.string().describe(policyResponsePrompts.EVENTS_ID),
                endpointId: z.string().describe(policyResponsePrompts.EVENTS_ENDPOINT_ID),
                value: z.string().describe(policyResponsePrompts.EVENTS_VALUE),
              })
              .array()
              .describe(policyResponsePrompts.EVENTS),
            remediation: z
              .object({
                message: z.string().describe(policyResponsePrompts.REMEDIATION_MESSAGE ?? ''),
                link: z.string().describe(policyResponsePrompts.REMEDIATION_LINK ?? ''),
              })
              .describe(policyResponsePrompts.REMEDIATION ?? ''),
          })
        ),
      });
    default:
      const customPrompts = PROMPTS.CUSTOM;
      return z.object({
        insights: z.array(
          z.object({
            group: z.string().describe(customPrompts.GROUP),
            events: z
              .object({
                id: z.string().describe(customPrompts.EVENTS_ID),
                endpointId: z.string().describe(customPrompts.EVENTS_ENDPOINT_ID),
                value: z.string().describe(customPrompts.EVENTS_VALUE),
              })
              .array()
              .describe(customPrompts.EVENTS),
            remediation: z
              .object({
                message: z.string().describe(customPrompts.REMEDIATION_MESSAGE ?? ''),
              })
              .describe(customPrompts.REMEDIATION ?? ''),
          })
        ),
      });
  }
}
