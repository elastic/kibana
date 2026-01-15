/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { SiemMigrationsService } from '../siem_migrations_service';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../plugin_contract';
import {
  createSiemMigrationsClientFactory,
  createSecuritySolutionContextFactory,
  createGetMigrationsTool,
  createGetMigrationRulesTool,
  createUpdateMigrationRuleTool,
  createInstallMigrationRulesTool,
  createStartMigrationTool,
  SIEM_MIGRATION_TOOL_IDS,
} from './tools';
import type { IRequestContextFactory } from '../../../request_context_factory';
import type { ProductFeaturesService } from '../../product_features_service';

export const SIEM_MIGRATION_AGENT_ID = 'security.siem_migration';

// Platform tools that are useful for SIEM migration tasks
const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
];

// All tools available to the SIEM Migration Agent
const SIEM_MIGRATION_AGENT_TOOL_IDS = [...PLATFORM_TOOL_IDS, ...SIEM_MIGRATION_TOOL_IDS];

export async function registerSiemMigrationTools({
  core,
  deps: { plugins, siemMigrationsService, productFeaturesService },
}: {
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>;
  deps: {
    plugins: SecuritySolutionPluginStartDependencies;
    siemMigrationsService: SiemMigrationsService;
    productFeaturesService: ProductFeaturesService;
  };
  logger: Logger;
  requestContextFactory: IRequestContextFactory;
}) {
  const { agentBuilder } = plugins;
  // Create client factory that tools will use to get scoped clients
  const getClient = createSiemMigrationsClientFactory({
    core,
    siemMigrationsService,
  });

  // Create Security Solution context factory for tools that need it
  const getSecuritySolutionContext = createSecuritySolutionContextFactory({
    core,
    plugins,
    requestContextFactory,
  });

  // Register SIEM migration tools
  const tools = [
    createGetMigrationsTool(getClient),
    createGetMigrationRulesTool(getClient),
    createUpdateMigrationRuleTool(getClient),
    createInstallMigrationRulesTool(getSecuritySolutionContext),
    createStartMigrationTool(getClient, core, logger),
  ];

  for (const tool of tools) {
    agentBuilder.tools.register(tool);
  }

  logger.debug(`Registered ${tools.length} SIEM migration tools`);

  // Register the SIEM Migration Agent
  agentBuilder.agents.register({
    id: SIEM_MIGRATION_AGENT_ID,
    name: 'SIEM Migration Agent',
    description:
      'Agent specialized in migrating SIEM rules from third-party platforms (Splunk, QRadar) to Elastic Security',
    avatar_icon: 'logoSecurity',
    configuration: {
      instructions:
        'You are a SIEM migration specialist agent.\n' +
        '\n' +
        '### YOUR ROLE\n' +
        'You help users migrate their security detection rules from third-party SIEM platforms ' +
        '(such as Splunk and IBM QRadar) to Elastic Security.\n' +
        '\n' +
        '### CAPABILITIES\n' +
        '- List all available rule migrations and their status\n' +
        '- Fetch and display rules from a specific migration\n' +
        '- Understand SPL (Splunk Processing Language) and AQL (Ariel Query Language) queries\n' +
        '- Translate and modify detection rules to ES|QL (Elastic Query Language)\n' +
        '- Help users understand the mapping between source and target rule formats\n' +
        '- Update migrated rules with improved ES|QL queries\n' +
        '- Test ES|QL queries before saving changes\n' +
        '\n' +
        '### WORKFLOW FOR MODIFYING RULES\n' +
        '1. Use get_migrations tool to list available migrations\n' +
        '2. Use get_migration_rules tool to find the specific rule the user wants to modify\n' +
        '3. Show the current original query and translated ES|QL query\n' +
        '4. Discuss what changes the user wants to make\n' +
        '5. Use generate_esql tool to create the modified query\n' +
        '6. Optionally use execute_esql tool to test the query\n' +
        '7. Ask for user confirmation before saving\n' +
        '8. Use update_migration_rule tool to save the changes\n' +
        '\n' +
        '### OUTPUT STYLE\n' +
        '- When displaying rules, show both the original query and the ES|QL translation\n' +
        '- Format ES|QL queries with proper syntax highlighting in code blocks\n' +
        '- Explain any differences or limitations between the original and translated rule\n' +
        '- Always ask for confirmation before updating a rule\n' +
        '- Provide a summary of changes made after updating',
      tools: [
        {
          tool_ids: SIEM_MIGRATION_AGENT_TOOL_IDS,
        },
      ],
    },
  });

  logger.debug('Successfully registered SIEM Migration Agent in Agent Builder');
}
