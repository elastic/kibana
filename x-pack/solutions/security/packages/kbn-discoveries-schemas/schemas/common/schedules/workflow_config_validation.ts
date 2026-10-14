/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

import { WorkflowConfig } from './schedule_types.gen';

/**
 * Validation message surfaced when none of the three composite retrieval toggles
 * (skill, default retrieval, alert retrieval workflows) are enabled.
 */
export const AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE =
  'At least one alert retrieval method must be enabled: the attack discovery skill, the default retrieval workflow, or alert retrieval workflows.';

/**
 * The composite three-toggle subset of {@link WorkflowConfig} that the
 * at-least-one-toggle rule depends on. Each toggle is optional so the predicate
 * can run against both fully-defaulted (post-parse) and partial configs.
 */
interface RetrievalToggles {
  alert_retrieval_workflows_enabled?: boolean;
  default_retrieval_enabled?: boolean;
  skill_enabled?: boolean;
}

/**
 * Returns true when at least one of the three composite retrieval toggles is enabled.
 *
 * Shared by the schema-layer refinement, the route handlers, and the UI form so that
 * the "at least one toggle" rule has a single source of truth.
 */
export const hasAtLeastOneRetrievalToggle = ({
  alert_retrieval_workflows_enabled: alertRetrievalWorkflowsEnabled,
  default_retrieval_enabled: defaultRetrievalEnabled,
  skill_enabled: skillEnabled,
}: RetrievalToggles): boolean =>
  skillEnabled === true ||
  defaultRetrievalEnabled === true ||
  alertRetrievalWorkflowsEnabled === true;

/**
 * {@link WorkflowConfig} refined to enforce the at-least-one-toggle rule at the schema layer.
 *
 * The generated {@link WorkflowConfig} cannot express a cross-field refinement (it is produced
 * by the OpenAPI codegen), so the refinement is composed here and consumed by route validation.
 */
export const WorkflowConfigWithRetrievalToggle = WorkflowConfig.refine(
  hasAtLeastOneRetrievalToggle,
  { error: AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE }
);
export type WorkflowConfigWithRetrievalToggle = z.infer<typeof WorkflowConfigWithRetrievalToggle>;
