/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { z } from '@kbn/zod/v4';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { buildKibanaApiHeaders, getKibanaBaseUrl } from './common';

export const getApplyRuleFixTool = (core: SecuritySolutionPluginCoreSetupDependencies) => ({
  id: 'security.fix-false-positive-alerts.apply-rule-fix',
  type: ToolType.builtin,
  description:
    'Apply a validated query change to a live detection rule by patching it via the Kibana API. ' +
    'Only call this after compare-rule-fix has confirmed the new query reduces alert volume without dropping to zero.',
  schema: z.object({
    ruleId: z
      .string()
      .describe('The detection rule saved-object ID (kibana.alert.rule.uuid) to patch'),
    newQuery: z
      .string()
      .describe(
        'The replacement query string to apply — must be the same query validated by compare-rule-fix'
      ),
    language: z
      .enum(['kuery', 'lucene'])
      .optional()
      .describe("Query language (kuery or lucene). Omit to keep the rule's existing language."),
  }),
  handler: async (
    { ruleId, newQuery, language }: { ruleId: string; newQuery: string; language?: string },
    context: { request: import('@kbn/core-http-server').KibanaRequest }
  ) => {
    try {
      console.log(`[apply-rule-fix] Applying fix for rule ${ruleId}`);
      console.log(`[apply-rule-fix] New query: ${newQuery}`);

      const { baseUrl, serverBasePath } = await getKibanaBaseUrl(core);
      const patchUrl = `${baseUrl}${serverBasePath}${DETECTION_ENGINE_RULES_URL}`;
      const headers = buildKibanaApiHeaders(context.request);

      const patchBody: Record<string, unknown> = {
        id: ruleId,
        query: newQuery,
        ...(language ? { language } : {}),
      };

      console.log(`[apply-rule-fix] PATCH ${patchUrl}`, JSON.stringify(patchBody, null, 2));
      const patchResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patchBody),
      });
      console.log(`[apply-rule-fix] PATCH response status: ${patchResponse.status}`);

      if (!patchResponse.ok) {
        const errorText = await patchResponse.text();
        console.log(`[apply-rule-fix] PATCH error body: ${errorText}`);
        throw new Error(`Rule patch failed (HTTP ${patchResponse.status}): ${errorText}`);
      }

      const updatedRule = (await patchResponse.json()) as {
        name?: string;
        type?: string;
        query?: string;
      };

      const summary =
        `Successfully patched rule "${updatedRule.name ?? ruleId}" ` +
        `(type: ${updatedRule.type ?? 'unknown'}). ` +
        `The new query has been applied: ${updatedRule.query ?? newQuery}`;
      console.log(`[apply-rule-fix] ${summary}`);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              summary,
              ruleId,
              ruleName: updatedRule.name,
              ruleType: updatedRule.type,
              appliedQuery: updatedRule.query ?? newQuery,
            },
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`[apply-rule-fix] CAUGHT ERROR: ${errorMessage}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to apply rule fix for ${ruleId}: ${errorMessage}`,
            },
          },
        ],
      };
    }
  },
});
