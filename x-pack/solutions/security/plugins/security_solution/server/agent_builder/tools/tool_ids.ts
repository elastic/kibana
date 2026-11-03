/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityTool } from './constants';

/**
 * Ids of tools that other registrations (attachment types, skills) refer to. Kept apart from the
 * tools so that referring to an id does not load the tool and what it imports.
 */
export const SECURITY_LABS_SEARCH_TOOL_ID = securityTool('security_labs_search');

export const SECURITY_GET_ENTITY_GRAPH_TOOL_ID = securityTool('get_entity_graph');

export const SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID = securityTool(
  'get_entity_risk_score_history'
);
