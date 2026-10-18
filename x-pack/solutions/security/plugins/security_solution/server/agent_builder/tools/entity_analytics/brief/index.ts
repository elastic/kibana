/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Entity Analytics AI brief. `generateBrief` turns the view captured by the "Generate AI brief" button
 * into markdown in five steps, one file each:
 *
 * 1. `read_entities`: reads the flagged entities and their risk from Elasticsearch, as the user.
 * 2. `build_facts`: what the model knows about each entity, as data.
 * 3. `draft_brief`: the model drafts the brief from the facts.
 * 4. `verify_draft`: checks the draft against the facts and the view, and trims it.
 * 5. `render_brief`: the markdown, with the entity table and a risk-history chart.
 *
 * `describe_scope` holds the wording the steps share, and `types` the types.
 */
export { generateBrief } from './generate_brief';
export { describeScopeForAgent } from './describe_scope';
