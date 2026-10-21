/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Entity Analytics AI brief. `generateBrief` turns the view captured by the "Generate AI brief" button
 * into an HTML brief in six steps, one file each:
 *
 * 1. `read_entities`: reads the flagged entities from the Entity Store, as the user.
 * 2. `build_facts`: what the model knows about each entity, as data.
 * 3. `draft_brief`: the model writes the summary, priorities and recommendation.
 * 4. `verify_draft`: keeps the draft to the flagged entities.
 * 5. `view_model`: the brief as plain data, with its notes, counts, priorities and risk history.
 * 6. `render_brief_html`: the HTML for an inline visualization, and the height of its card.
 *
 * `prompts` holds everything sent to a model: the drafting prompt and schema, and what the agent is told.
 * `describe_scope` holds the wording the steps share, and `types` the types.
 */
export { generateBrief } from './generate_brief';
export { describeScopeForAgent } from './describe_scope';
export {
  ATTACHMENT_AGENT_DESCRIPTION,
  BRIEF_RESULT_INSTRUCTIONS,
  getBriefToolDescription,
  getBriefToolId,
} from './prompts';
