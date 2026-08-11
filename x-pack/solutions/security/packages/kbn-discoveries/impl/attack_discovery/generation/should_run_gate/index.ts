/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generation trigger value used by the Agent Builder skill `run` tool entry
 * point (the conversational Attack Discovery path).
 */
export const AGENT_BUILDER_TRIGGER = 'agent_builder';

/**
 * Returns whether the always-on ground-truthing gate should run for a given
 * generation trigger.
 *
 * The gate runs for every trigger EXCEPT `agent_builder`. The conversational
 * Attack Discovery skill (the `agent_builder` entry point) has already
 * retrieved and ground-truthed its own data before delegating to the
 * generation pipeline, so re-running the gate would double-invoke the skill.
 *
 * This explicit skip is also the structural recursion break: if the gate's
 * `ai.agent` ever invoked the skill's `security.attack-discovery.run` tool,
 * that run re-enters generation with `trigger === 'agent_builder'`, which skips
 * the gate here and terminates instead of recursing.
 */
export const shouldRunGate = (trigger?: string): boolean => trigger !== AGENT_BUILDER_TRIGGER;
