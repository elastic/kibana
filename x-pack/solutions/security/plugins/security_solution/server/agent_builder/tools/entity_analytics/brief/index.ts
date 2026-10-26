/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Entity Analytics AI brief. `generateBrief` turns the view captured by the "Generate AI brief" button
 * into an HTML brief in seven steps, one file each:
 *
 * 1. `read_entities`: reads the flagged entities from the Entity Store, as the user.
 * 2. `read_alert_rules` and `read_anomalies`: the open alerts of each entity and the rules behind them, and
 *    its anomaly records and their jobs, as the user.
 * 3. `build_facts`: what the model knows about each entity, as data.
 * 4. `draft_brief`: the model writes the summary, priorities and recommendation.
 * 5. `verify_draft`: keeps the draft to the flagged entities.
 * 6. `view_model`: the brief as plain data, with its notes, counts, priorities and risk history.
 * 7. `render_brief_html`: the HTML for an inline visualization, and the height of its card.
 *
 * `prompts` holds everything sent to a model: the drafting prompt and schema, and what the agent is told.
 * `describe_scope` holds the wording the steps share, and `types` the types.
 */
export { generateBrief } from './generate_brief';
export { describeScopeForAgent } from './describe_scope';
export type { BriefJobService } from './types';
export {
  ATTACHMENT_AGENT_DESCRIPTION,
  BRIEF_RESULT_INSTRUCTIONS,
  getBriefToolDescription,
  getBriefToolId,
} from './prompts';
