/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type SLOStatus = 'HEALTHY' | 'DEGRADING' | 'VIOLATED' | 'NO_DATA';

/**
 * Checks if an SLO has failed (is in DEGRADING or VIOLATED status)
 * @param status - The SLO summary status
 * @returns true if the SLO is in a failed state (DEGRADING or VIOLATED), false otherwise
 */
export function isSloFailed(status: SLOStatus): boolean {
  return status === 'DEGRADING' || status === 'VIOLATED';
}

/**
 * Converts an SLO status to a chart state
 * @param status - The SLO summary status
 * @returns 'error' if the SLO is failed, 'success' otherwise
 */
export function getSloChartState(status: SLOStatus): 'error' | 'success' {
  return isSloFailed(status) ? 'error' : 'success';
}
