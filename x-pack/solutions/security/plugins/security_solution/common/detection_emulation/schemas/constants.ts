/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * PROD-3: hard cap on the number of endpoint agent IDs a single emulation
 * call may target.
 *
 * Why a constant (not a magic number on each schema):
 * - Single source of truth for the tool boundary schemas
 *   (`validateRuleSchema`, `runProcessCommandSchema`, etc.), the central
 *   route schemas (`ValidateRuleInputSchema`, `RunEmulationCommandInputSchema`),
 *   and the prose `.describe()` strings the LLM reads. Drift between any two
 *   would mean the LLM learns one limit and the runtime enforces another.
 * - Names the bound in error messages so an operator hitting the cap knows
 *   which knob to discuss raising.
 *
 * Why 5:
 * - A single `validateRule` call already fans out to N (payloads) × M
 *   (endpoints) response-action dispatches. With M=5 and a typical
 *   N=3 (one payload per MITRE technique covered by the rule), a single
 *   call can already consume 15 EDR API calls — well past the per-host
 *   rate-limit budget proposed in PROD-4.
 * - Operators routinely ask "validate this rule against my pilot host" or
 *   "validate against the three test agents in space X"; 5 covers those
 *   shapes without inviting "validate against the entire fleet" misuse.
 * - The cap is intentionally below the per-space rate-limit capacity so a
 *   single accidental large fanout cannot exhaust the per-space budget.
 *
 * Raising this requires (a) raising the per-host rate-limit bucket from
 * PROD-4 in lockstep so the larger fanout doesn't immediately get
 * 429-blocked, and (b) updating the skill body Guardrails table so the
 * LLM advertises the new bound to users.
 */
export const MAX_ENDPOINT_FANOUT = 5;
