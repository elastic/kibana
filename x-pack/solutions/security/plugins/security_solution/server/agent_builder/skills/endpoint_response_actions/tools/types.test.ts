/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  endpointNotFoundData,
  insufficientPrivilegesResult,
  resolveAgentTypeFromPackages,
  responseActionErrorResult,
} from './types';
import { ToolResultType } from '@kbn/agent-builder-common';

describe('response action error helpers', () => {
  it('responseActionErrorResult returns a typed error envelope', () => {
    const result = responseActionErrorResult('action_not_found', 'Action missing');

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual({
      error: 'action_not_found',
      message: 'Action missing',
    });
  });

  it('insufficientPrivilegesResult includes the privilege field', () => {
    const result = insufficientPrivilegesResult('canIsolateHost');

    expect(result.results[0].data).toEqual(
      expect.objectContaining({
        error: 'insufficient_privileges',
        privilege: 'canIsolateHost',
      })
    );
  });

  it('endpointNotFoundData returns a consistent not-found shape', () => {
    expect(endpointNotFoundData('lost-host')).toEqual(
      expect.objectContaining({
        kind: 'response_action_result',
        hostName: 'lost-host',
        found: false,
        reason: 'endpoint_not_found',
        isolated: false,
        lastSeen: null,
      })
    );
  });
});

describe('resolveAgentTypeFromPackages', () => {
  it('defaults to endpoint when packages is undefined', () => {
    expect(resolveAgentTypeFromPackages(undefined)).toBe('endpoint');
  });

  it('defaults to endpoint when packages is empty', () => {
    expect(resolveAgentTypeFromPackages([])).toBe('endpoint');
  });

  it('defaults to endpoint when no known package is present', () => {
    expect(resolveAgentTypeFromPackages(['some_other_integration'])).toBe('endpoint');
  });

  it('resolves endpoint from the endpoint package', () => {
    expect(resolveAgentTypeFromPackages(['endpoint'])).toBe('endpoint');
  });

  it('resolves sentinel_one from the sentinel_one package', () => {
    expect(resolveAgentTypeFromPackages(['sentinel_one'])).toBe('sentinel_one');
  });

  it('resolves crowdstrike from the crowdstrike package', () => {
    expect(resolveAgentTypeFromPackages(['crowdstrike'])).toBe('crowdstrike');
  });

  it('resolves microsoft_defender_endpoint from the microsoft_defender_endpoint package', () => {
    expect(resolveAgentTypeFromPackages(['microsoft_defender_endpoint'])).toBe(
      'microsoft_defender_endpoint'
    );
  });

  it('resolves microsoft_defender_endpoint from the legacy m365_defender package', () => {
    expect(resolveAgentTypeFromPackages(['m365_defender'])).toBe('microsoft_defender_endpoint');
  });

  it('resolves the matching agent type when multiple unrelated packages are installed', () => {
    expect(resolveAgentTypeFromPackages(['fleet_server', 'sentinel_one', 'system'])).toBe(
      'sentinel_one'
    );
  });
});
