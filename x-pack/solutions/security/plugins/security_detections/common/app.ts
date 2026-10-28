/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The id of the Detection Rules v2 Kibana app.
 *
 * It doubles as the deep link id that the Security solution's navigation tree
 * references from its Rules panel, so the two must stay in step. The nav side
 * of that pair lives in `@kbn/security-solution-navigation`'s
 * `rules_navigation_tree.ts`, which cannot import this constant without
 * depending on this plugin, and so repeats the literal.
 */
export const DETECTIONS_V2_APP_ID = 'securityDetectionsV2';
