/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Soft deadline for the run step in `sync` mode.
 *
 * Why: Agent Builder workflow tools wait up to `WAIT_FOR_COMPLETION_TIMEOUT_SEC`
 * (120s) for a workflow to complete. Real Attack Discovery generations frequently
 * exceed that ceiling. If we let the AB wrapper hit its own timeout, the agent
 * receives a workflow execution ID without the run step's output, which is not
 * useful for the AD-specific resume path.
 *
 * Instead, the run step itself watches a soft deadline well below the AB ceiling.
 * If the pipeline isn't done by then, the executor returns `{ execution_uuid }`
 * (matching async-mode output) and lets the underlying pipeline keep running in
 * the background. The AB wrapper sees the workflow as completed and forwards the
 * clean result. The agent then handles the slow-path handoff via the dedicated
 * AD status tool.
 *
 * The 30s of headroom under 120s covers serialization, network, and workflow
 * engine overhead.
 */
export const ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS = 90_000;
