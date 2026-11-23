/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentKnowledgePluginSetup } from '@kbn/agent-knowledge-plugin/server';
import {
  ALERTZERO_WIKI_ID,
  ALERTZERO_WIKI_INDEX,
  DETECTION_RULE_ENTRIES_HEADING,
  DETECTION_RULE_PAGE_TYPE,
} from '../../common/rule_tuning_wiki';

export const registerAlertZeroWiki = (
  agentKnowledge: Pick<AgentKnowledgePluginSetup, 'registerWiki'>
): void => {
  agentKnowledge.registerWiki({
    id: ALERTZERO_WIKI_ID,
    index: ALERTZERO_WIKI_INDEX,
    pageTypes: {
      [DETECTION_RULE_PAGE_TYPE]: { entriesHeading: DETECTION_RULE_ENTRIES_HEADING },
    },
  });
};
