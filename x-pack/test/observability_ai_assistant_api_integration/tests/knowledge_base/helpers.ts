/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';

export async function clearKnowledgeBase(es: Client) {
  const KB_INDEX = '.kibana-observability-ai-assistant-kb-*';

  return es.deleteByQuery({
    index: KB_INDEX,
    conflicts: 'proceed',
    query: { match_all: {} },
    refresh: true,
  });
}

export async function clearConversations(es: Client) {
  const KB_INDEX = '.kibana-observability-ai-assistant-conversations-*';

  return es.deleteByQuery({
    index: KB_INDEX,
    conflicts: 'proceed',
    query: { match_all: {} },
    refresh: true,
  });
}
