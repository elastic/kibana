/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
  SecuritySolutionPluginSetupDependencies,
} from '../../plugin_contract';
import { securityTool } from './constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

export const SECURITY_MANAGE_RULE_EXCEPTIONS_TOOL_ID = securityTool('manage_rule_exceptions');

const matchEntry = z.object({
  type: z.literal('match'),
  field: z.string().describe('ECS field name (e.g., process.name, source.ip)'),
  value: z.string().describe('Exact value to match'),
  operator: z
    .enum(['included', 'excluded'])
    .default('included')
    .describe('"included" means the exception matches when the field equals the value'),
});

const matchAnyEntry = z.object({
  type: z.literal('match_any'),
  field: z.string().describe('ECS field name'),
  value: z.array(z.string()).min(1).describe('List of values — exception matches if any apply'),
  operator: z.enum(['included', 'excluded']).default('included'),
});

const existsEntry = z.object({
  type: z.literal('exists'),
  field: z.string().describe('ECS field name'),
  operator: z
    .enum(['included', 'excluded'])
    .default('included')
    .describe('"included" means exception matches when field exists'),
});

const wildcardEntry = z.object({
  type: z.literal('wildcard'),
  field: z.string().describe('ECS field name'),
  value: z.string().describe('Wildcard pattern (e.g., *.exe, 192.168.*)'),
  operator: z.enum(['included', 'excluded']).default('included'),
});

const exceptionEntrySchema = z.discriminatedUnion('type', [
  matchEntry,
  matchAnyEntry,
  existsEntry,
  wildcardEntry,
]);

const manageRuleExceptionsSchema = z.object({
  rule_id: z.string().describe('The rule_id of the detection rule to add the exception to'),
  name: z.string().describe('Human-readable name for this exception item'),
  description: z.string().describe('Why this exception is being created'),
  entries: z
    .array(exceptionEntrySchema)
    .min(1)
    .describe(
      'Conditions that define when the exception applies. All entries are AND-ed together.'
    ),
});

export function manageRuleExceptionsTool(
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  setupPlugins: Pick<SecuritySolutionPluginSetupDependencies, 'lists'>,
  logger: Logger
): StaticToolRegistration<typeof manageRuleExceptionsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof manageRuleExceptionsSchema> = {
    id: SECURITY_MANAGE_RULE_EXCEPTIONS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Creates an exception item on a detection rule to suppress false positives. ' +
      'Provide the rule_id, a descriptive name/reason, and one or more entry conditions ' +
      '(match, match_any, exists, wildcard). All entry conditions are AND-ed together.',
    schema: manageRuleExceptionsSchema,
    tags: ['security', 'detection', 'exceptions', 'tuning'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({
          core,
          request,
          logger,
        });
      },
    },
    handler: async ({ rule_id: ruleId, name, description, entries }, { request }) => {
      try {
        const [coreStart, startPlugins] = await core.getStartServices();

        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

        const rules = await rulesClient.find({
          options: {
            filter: `alert.attributes.params.ruleId: "${ruleId}"`,
            perPage: 1,
          },
        });

        if (rules.total === 0) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Detection rule with rule_id "${ruleId}" not found.`,
                },
              },
            ],
          };
        }

        const rule = rules.data[0];

        if (!setupPlugins.lists) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: 'Exception lists plugin is not available.',
                },
              },
            ],
          };
        }

        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const username = coreStart.security.authc.getCurrentUser(request)?.username || 'elastic';
        const exceptionListClient = setupPlugins.lists.getExceptionListClient(
          savedObjectsClient,
          username
        );

        const exceptionListId = await getOrCreateDefaultExceptionList(
          exceptionListClient,
          rule,
          ruleId,
          rulesClient
        );

        const exceptionEntries = entries.map((entry) => ({ ...entry }));

        const createdItem = await exceptionListClient.createExceptionListItem({
          listId: exceptionListId,
          namespaceType: 'single',
          name,
          description,
          entries: exceptionEntries,
          itemId: `${ruleId}-exception-${Date.now()}`,
          osTypes: [],
          tags: ['agent-builder'],
          type: 'simple',
          meta: undefined,
          comments: [],
          expireTime: undefined,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                message: `Exception "${name}" created on rule "${ruleId}".`,
                exception_item_id: createdItem.item_id,
                exception_list_id: exceptionListId,
                rule_name: rule.name,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Manage rule exceptions tool failed: ${error.message}`, error);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create exception: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}

async function getOrCreateDefaultExceptionList(
  exceptionListClient: ReturnType<
    NonNullable<SecuritySolutionPluginSetupDependencies['lists']>['getExceptionListClient']
  >,
  rule: {
    id: string;
    name: string;
    tags: string[];
    schedule: { interval: string };
    actions: unknown[];
    params: Record<string, unknown>;
  },
  ruleId: string,
  rulesClient: {
    update: (args: {
      id: string;
      data: {
        name: string;
        tags: string[];
        schedule: { interval: string };
        actions: unknown[];
        params: Record<string, unknown>;
      };
    }) => Promise<unknown>;
  }
): Promise<string> {
  const exceptionsList =
    (rule.params.exceptionsList as Array<{ list_id: string; type: string }>) ?? [];
  const defaultList = exceptionsList.find((list) => list.type === 'rule_default');

  if (defaultList) {
    return defaultList.list_id;
  }

  const listId = `${ruleId}-default-exception-list`;
  await exceptionListClient.createExceptionList({
    listId,
    namespaceType: 'single',
    name: `Auto-generated exceptions for ${ruleId}`,
    description: `Default exception list for detection rule ${ruleId}`,
    type: 'rule_default',
    immutable: false,
    meta: undefined,
    tags: [],
    osTypes: [],
    version: 1,
  });

  await rulesClient.update({
    id: rule.id,
    data: {
      name: rule.name,
      tags: rule.tags,
      schedule: rule.schedule,
      actions: rule.actions,
      params: {
        ...rule.params,
        exceptionsList: [
          ...exceptionsList,
          {
            id: listId,
            list_id: listId,
            namespace_type: 'single',
            type: 'rule_default',
          },
        ],
      },
    },
  });

  return listId;
}
