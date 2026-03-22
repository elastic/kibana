/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * LLM-Powered Alert Investigation
 *
 * Foundation Spike: 2-agent autonomous investigation system
 *
 * Architecture:
 * - Agent 1: Triage (classification, severity, attack type)
 * - Agent 2: MITRE Mapper (ATT&CK framework mapping)
 * - LangGraph Orchestrator (coordinates agents)
 *
 * Success Criteria:
 * - <30s latency for 2-agent investigation
 * - Integrates with Cases
 * - Safe to merge (feature flag: llmInvestigationEnabled)
 */

export * from './types';
export * from './agents';
export * from './helpers';
export { createInvestigationGraph, executeInvestigation } from './graphs/investigation_graph';
