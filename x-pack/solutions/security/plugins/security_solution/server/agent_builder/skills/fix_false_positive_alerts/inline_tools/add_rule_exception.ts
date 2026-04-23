/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import type { Logger } from '@kbn/core/server';
import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { z } from '@kbn/zod/v4';
import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { getRuleById } from '../../../../lib/detection_engine/rule_management/logic/detection_rules_client/methods/get_rule_by_id';
import { buildKibanaApiHeaders, getKibanaBaseUrl } from './common';

const exceptionEntrySchema = z.object({
  field: z.string().describe('The field to match (e.g. "process.parent.name")'),
  operator: z
    .enum(['included', 'excluded'])
    .describe('"included" means alerts WITH this value are suppressed'),
  type: z
    .enum(['match', 'match_any', 'exists', 'wildcard'])
    .describe('Match type: "match" for exact, "match_any" for array, "wildcard" for glob patterns'),
  value: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(
      'Value(s) to match. String for "match"/"wildcard", string array for "match_any". Omit for "exists".'
    ),
});

export const getAddRuleExceptionTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
) => ({
  id: 'security.fix-false-positive-alerts.add-rule-exception',
  type: ToolType.builtin,
  description:
    'Add an exception item to a detection rule to suppress known false-positive alerts. ' +
    'Automatically ensures the rule has a default exception list before creating the item. ' +
    'Prefer this over query modification when the false positive source is a known-good entity.',
  schema: z.object({
    ruleId: z.string().describe('The detection rule saved-object ID (kibana.alert.rule.uuid)'),
    entries: z
      .array(exceptionEntrySchema)
      .min(1)
      .describe(
        'Exception entries — conditions that suppress alerts when ALL entries match (AND logic within an item)'
      ),
    name: z.string().describe('Human-readable name for this exception item'),
    description: z.string().optional().describe('Why this exception is being added'),
  }),
  handler: async (
    {
      ruleId,
      entries,
      name,
      description,
    }: {
      ruleId: string;
      entries: Array<{
        field: string;
        operator: 'included' | 'excluded';
        type: 'match' | 'match_any' | 'exists' | 'wildcard';
        value?: string | string[];
      }>;
      name: string;
      description?: string;
    },
    context: {
      request: import('@kbn/core-http-server').KibanaRequest;
      esClient: import('@kbn/core-elasticsearch-server').IScopedClusterClient;
      spaceId: string;
    }
  ) => {
    try {
      console.log(`[add-rule-exception] Adding exception to rule ${ruleId}`);

      const [, startPlugins] = await core.getStartServices();
      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(context.request);
      const rule = await getRuleById({ rulesClient, id: String(ruleId) });

      if (!rule) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Rule with ID "${ruleId}" not found.` },
            },
          ],
        };
      }

      const { baseUrl, serverBasePath } = await getKibanaBaseUrl(core);
      const headers = buildKibanaApiHeaders(context.request);

      const ruleObj = rule as unknown as Record<string, unknown>;
      const exceptionsList = (ruleObj.exceptions_list ?? []) as Array<{
        id: string;
        list_id: string;
        type: string;
        namespace_type: string;
      }>;

      let defaultList = exceptionsList.find((l) => l.type === 'rule_default');

      if (!defaultList) {
        console.log(`[add-rule-exception] No rule_default exception list found — creating one`);

        const listBody = {
          name: `${rule.name} — Exceptions`,
          description: `Auto-created rule_default exception list for rule "${rule.name}"`,
          type: 'rule_default',
          namespace_type: 'single',
          tags: [],
        };

        const createListUrl = `${baseUrl}${serverBasePath}${EXCEPTION_LIST_URL}`;
        console.log(`[add-rule-exception] POST ${createListUrl}`);

        const listResponse = await fetch(createListUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(listBody),
        });

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          throw new Error(
            `Failed to create exception list (HTTP ${listResponse.status}): ${errorText}`
          );
        }

        const createdList = (await listResponse.json()) as {
          id: string;
          list_id: string;
        };

        defaultList = {
          id: createdList.id,
          list_id: createdList.list_id,
          type: 'rule_default',
          namespace_type: 'single',
        };

        console.log(`[add-rule-exception] Created list: ${createdList.list_id}`);

        const patchUrl = `${baseUrl}${serverBasePath}${DETECTION_ENGINE_RULES_URL}`;
        const patchBody = {
          id: ruleId,
          exceptions_list: [...exceptionsList, defaultList],
        };

        console.log(`[add-rule-exception] PATCHing rule to attach exception list`);
        const patchResponse = await fetch(patchUrl, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(patchBody),
        });

        if (!patchResponse.ok) {
          const errorText = await patchResponse.text();
          throw new Error(
            `Failed to attach exception list to rule (HTTP ${patchResponse.status}): ${errorText}`
          );
        }
        console.log(`[add-rule-exception] Rule patched with new exception list`);
      }

      const itemBody = {
        list_id: defaultList.list_id,
        name,
        description: description ?? `Exception added by fix-false-positive-alerts skill`,
        type: 'simple',
        namespace_type: 'single',
        entries,
        tags: ['agent-builder'],
      };

      const createItemUrl = `${baseUrl}${serverBasePath}${EXCEPTION_LIST_ITEM_URL}`;
      console.log(`[add-rule-exception] POST ${createItemUrl}`, JSON.stringify(itemBody, null, 2));

      const itemResponse = await fetch(createItemUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(itemBody),
      });

      if (!itemResponse.ok) {
        const errorText = await itemResponse.text();
        throw new Error(
          `Failed to create exception item (HTTP ${itemResponse.status}): ${errorText}`
        );
      }

      const createdItem = (await itemResponse.json()) as {
        id: string;
        item_id: string;
        name: string;
        entries: unknown[];
      };

      const summary =
        `Successfully added exception "${createdItem.name}" to rule "${rule.name}". ` +
        `Exception item ID: ${createdItem.item_id}. ` +
        `Use compare-rule-fix with excludeExceptionsFromBaseline: ["${defaultList.list_id}"] to verify the exception reduces alerts.`;
      console.log(`[add-rule-exception] ${summary}`);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              summary,
              ruleId,
              ruleName: rule.name,
              exceptionItemId: createdItem.item_id,
              exceptionListId: defaultList.list_id,
              exceptionListReference: {
                id: defaultList.id,
                list_id: defaultList.list_id,
                type: defaultList.type,
                namespace_type: defaultList.namespace_type,
              },
              entries: createdItem.entries,
            },
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`[add-rule-exception] CAUGHT ERROR: ${errorMessage}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to add exception for rule ${ruleId}: ${errorMessage}`,
            },
          },
        ],
      };
    }
  },
});
