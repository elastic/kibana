/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Index pattern this suite's trace evaluators read spans from.
 *
 * Deliberately local to the suite: it hand-rolls its own ES|QL against
 * `traceEsClient`, so it does not inherit the shared trace-evaluator pattern and
 * must not force that pattern on other suites.
 *
 * `traces-*` alone is not enough. On a remote tracing cluster the eval API key is
 * granted on the datastream BACKING indices (`.ds-traces-generic*`,
 * `.ds-traces-agent_builder*`), which `traces-*` does not match -- so the pattern
 * resolves to zero authorized indices and ES|QL reports `Unknown column
 * [trace.id]`. That reads like "the model emitted no spans" but means "this key
 * may not see any index under that pattern", and it silently nulled the
 * SkillInvoked metric for every model on the golden cluster.
 *
 * Both forms are listed so the evaluator works against a local Scout cluster
 * (plain datastream name) and a remote one (backing indices) without knowing
 * which it was handed.
 */
export const TRACE_INDEX_PATTERN = 'traces-*,.ds-traces-*';
