/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Entity Analytics AI brief. `generateBrief` turns the page view captured by the "Generate AI
 * brief" button into markdown, in five steps, each its own file:
 *
 * 1. `read_entities`: reads the view's flagged entities and their risk from Elasticsearch, as the user.
 * 2. `build_facts`: states numbered facts about each entity, the only evidence the model sees.
 * 3. `draft_brief`: the model drafts the brief from the facts, in one forced tool call.
 * 4. `verify_draft`: checks the draft against the facts and the view, and trims it.
 * 5. `render_brief`: renders the markdown, with the entity table and a risk-history chart.
 *
 * `describe_scope` holds the wording the steps share, and `brief_types` the types.
 */
export { generateBrief } from './generate_brief';
export { describeScopeForAgent } from './describe_scope';
