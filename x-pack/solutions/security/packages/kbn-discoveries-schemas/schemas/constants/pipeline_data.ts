/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sentinel `workflow_run_id` (and `workflow_id`) written by the server when
 * reconstructing alert-retrieval data for provided-mode executions.
 *
 * The server sets this value; the client uses it to locate the synthetic
 * alert-retrieval entry in the pipeline-data response.  Both sides must
 * use this constant so a rename is caught by the TypeScript compiler.
 */
export const PROVIDED_WORKFLOW_RUN_ID = 'provided' as const;

/**
 * Step ID for the alert-retrieval phase of the Attack Discovery pipeline.
 * Used both as a `stepId` in workflow step executions and as a
 * `pipelinePhase` label on aggregated step execution objects.
 */
export const RETRIEVE_ALERTS_STEP_ID = 'retrieve_alerts' as const;

/**
 * Step ID for the generation phase of the Attack Discovery pipeline.
 * Used both as a `stepId` in workflow step executions and as a
 * `pipelinePhase` label on aggregated step execution objects.
 */
export const GENERATE_DISCOVERIES_STEP_ID = 'generate_discoveries' as const;

/**
 * Step ID for the validation phase of the Attack Discovery pipeline.
 * Used both as a `stepId` in workflow step executions and as a
 * `pipelinePhase` label on aggregated step execution objects.
 */
export const VALIDATE_DISCOVERIES_STEP_ID = 'validate_discoveries' as const;

/**
 * Step ID for the promotion phase — an alias for validation used by some
 * workflow variants.
 */
export const PROMOTE_DISCOVERIES_STEP_ID = 'promote_discoveries' as const;
