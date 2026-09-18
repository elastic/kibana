/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Owned key set for the `feedback.*` block on `.kibana-threat-reports`
 * (plan.md Phase 4, task 4.4: "disjoint field-set write"). F4's writer must
 * only ever touch these keys — never `attribution.*` (the ambient rollup
 * writer's block) and never any other top-level field. Enumerated here so
 * tests can assert the emitted update doc's keys are a subset of this list.
 */
export const HUNT_FEEDBACK_OWNED_FIELDS = [
  'feedback.ioc_hit_count',
  'feedback.ttp_hit_count',
  'feedback.affected_host_count',
  'feedback.affected_user_count',
  'feedback.last_hunted_at',
  'feedback.last_hunt_status',
  'feedback.last_hunt_window',
  'feedback.last_hunt_run_id',
  'feedback.last_hunt_hit_count',
  'corroborated_rank_score',
] as const;

export type HuntFeedbackOwnedField = (typeof HUNT_FEEDBACK_OWNED_FIELDS)[number];
