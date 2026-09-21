/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { WATCHES_SEED } from './watches';
export { WORKERS_SEED } from './workers';
export type { WatchWorkerSeed } from './workers';
export { SKILLS_SEED } from './skills';
export type { WatchSkillSeed } from './skills';

// `MOCK_INVESTIGATIONS` is deliberately not re-exported: no route serves investigations, so it
// exists only as the incident set `MOCK_PROPOSALS` derives its conversation titles from.
export { MOCK_PROPOSALS } from './proposals';
