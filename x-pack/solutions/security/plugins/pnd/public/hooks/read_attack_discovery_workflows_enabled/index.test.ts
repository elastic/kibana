/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER } from '../../../common/constants';
import { readAttackDiscoveryWorkflowsEnabled } from '.';

const createResponse = (headers: Record<string, string>): Response =>
  ({ headers: new Headers(headers) } as Response);

describe('readAttackDiscoveryWorkflowsEnabled', () => {
  it('reads `true`', () => {
    expect(
      readAttackDiscoveryWorkflowsEnabled(
        createResponse({ [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' })
      )
    ).toBe(true);
  });

  it('reads `false`, which is what tells an empty list from a disabled feature', () => {
    expect(
      readAttackDiscoveryWorkflowsEnabled(
        createResponse({ [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false' })
      )
    ).toBe(false);
  });

  it('is case-insensitive about the header name, as a real Response is', () => {
    expect(
      readAttackDiscoveryWorkflowsEnabled(
        createResponse({ [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER.toUpperCase()]: 'true' })
      )
    ).toBe(true);
  });

  it('stays undefined when the header is absent, rather than guessing the feature is off', () => {
    expect(readAttackDiscoveryWorkflowsEnabled(createResponse({}))).toBeUndefined();
  });

  it('stays undefined for a value that is neither `true` nor `false`', () => {
    expect(
      readAttackDiscoveryWorkflowsEnabled(
        createResponse({ [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'maybe' })
      )
    ).toBeUndefined();
  });

  it('stays undefined when there is no response at all', () => {
    expect(readAttackDiscoveryWorkflowsEnabled(undefined)).toBeUndefined();
  });
});
