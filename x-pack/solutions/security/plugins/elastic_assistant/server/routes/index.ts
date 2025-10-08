/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Actions Connector Execute (LLM Wrapper)
export { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';

// Attack Discovery
export { findAttackDiscoveriesRoute } from './attack_discovery/public/get/find_attack_discoveries';
export { getAttackDiscoveryGenerationsRoute } from './attack_discovery/public/get/get_attack_discovery_generations';

// Defend insights
export { postDefendInsightsRoute } from './defend_insights/post_defend_insights';
export { getDefendInsightsRoute } from './defend_insights/get_defend_insights';
export { getDefendInsightRoute } from './defend_insights/get_defend_insight';

// Knowledge Base
export { getKnowledgeBaseStatusRoute } from './knowledge_base/get_knowledge_base_status';
export { postKnowledgeBaseRoute } from './knowledge_base/post_knowledge_base';

// Evaluate
export { postEvaluateRoute } from './evaluate/post_evaluate';

// Users
export { suggestUsersRoute } from './users/suggest';
