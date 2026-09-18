/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Soft deadline for the Agent Builder Attack Discovery run **tool** in `sync` mode.
 *
 * Consumed only by `run_attack_discovery_tool`, not by the run step. The step and
 * the tool share the `security.attack-discovery.run` name but are separate
 * implementations, and the step deliberately applies no soft deadline: a workflow
 * caller has no wrapper ceiling to respect and needs the discoveries inline, so it
 * bounds the wait with its own step `timeout` instead (see ADR-012 in the plugin
 * README). This constant stays here because the tool imports it from this path.
 *
 * Why the tool needs one: an Agent Builder turn must not stall. Real Attack
 * Discovery generations frequently exceed two minutes, which is over the 120s
 * `WAIT_FOR_COMPLETION_TIMEOUT_SEC` ceiling. When the deadline wins, the tool
 * returns `{ execution_uuid }` (matching async-mode output) and lets the pipeline
 * keep running in the background; the agent handles the slow-path handoff via the
 * dedicated AD status tool.
 *
 * The 30s of headroom under 120s covers serialization, network, and workflow
 * engine overhead.
 */
export const ATTACK_DISCOVERY_RUN_SOFT_DEADLINE_MS = 90_000;
