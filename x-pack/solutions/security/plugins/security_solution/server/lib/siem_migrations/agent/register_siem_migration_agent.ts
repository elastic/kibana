/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/onechat-common';
import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server/types';

export const SIEM_MIGRATION_AGENT_ID = 'security.siem_migration';

const SIEM_MIGRATION_AGENT_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
];

export async function registerSiemMigrationAgent({
  onechat,
  logger,
}: {
  onechat: OnechatPluginSetup;
  logger: Logger;
}) {
  onechat.agents.register({
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
        '- Understand SPL (Splunk Processing Language) and AQL (Ariel Query Language) queries\n' +
        '- Translate detection rules to ES|QL (Elastic Query Language)\n' +
        '- Help users understand the mapping between source and target rule formats\n' +
        '- Provide guidance on Elastic Security detection rules best practices\n' +
        '- Search and explore indices to help with field mapping\n' +
        '\n' +
        '### OUTPUT STYLE\n' +
        '- When providing translated rules, format them clearly with ES|QL syntax highlighting\n' +
        '- Explain any differences or limitations between the original and translated rule\n' +
        '- Suggest improvements or optimizations for the translated rules when applicable',
      tools: [
        {
          tool_ids: SIEM_MIGRATION_AGENT_TOOL_IDS,
        },
      ],
    },
  });

  logger.debug('Successfully registered SIEM Migration Agent in Agent Builder');
}
