/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalPageName } from '@kbn/security-solution-navigation';
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
import { KNOWLEDGE_SOURCES } from './translations';

export const knowledgeSourceLink: NodeDefinition<AppDeepLinkId, string, string> = {
  id: ExternalPageName.managementKnowledgeSources,
  // TODO: Add the missing ?tab=knowledge_base parameter
  link: ExternalPageName.managementKnowledgeSources,
  title: KNOWLEDGE_SOURCES,
};
