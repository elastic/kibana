/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../../../../common/constants';

/**
 * The response header carrying the "did any run correlate to this discovery" signal, ready to spread
 * into `response.ok`. Mirrors `buildAttackDiscoveryWorkflowsSignalHeaders`: the four-phase body is
 * always the complete 14-row skeleton, so the only place this fact can live is a header, and without
 * it an uncorrelated discovery is indistinguishable from one whose runs simply have not reached
 * these rows yet.
 */
export const buildExecutionCorrelationHeaders = (correlated: boolean): Record<string, string> => ({
  [PND_EXECUTION_CORRELATED_HEADER]: String(correlated),
});
