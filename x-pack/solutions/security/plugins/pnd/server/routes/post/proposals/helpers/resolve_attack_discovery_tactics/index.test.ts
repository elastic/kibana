/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';
import {
  PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS,
} from '@kbn/pnd-common';

import { findAttackDiscoveryAlerts } from '../../../../get/conversations/helpers/find_attack_discovery_alerts';
import { resolveAttackDiscoveryTactics } from '.';

jest.mock('../../../../get/conversations/helpers/find_attack_discovery_alerts');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.MockedFunction<
  typeof findAttackDiscoveryAlerts
>;

const alert = (tactics: unknown): AttackDiscoveryApiAlert =>
  ({ id: 'ad-1', mitre_attack_tactics: tactics } as unknown as AttackDiscoveryApiAlert);

const defaultParams = {
  correlationId: 'ad-1',
  http: {} as unknown as HttpServiceStart,
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'agent-3',
};

describe('resolveAttackDiscoveryTactics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([alert(['Initial Access', 'Execution'])]);
  });

  it('returns the tactics carried by the discovery', async () => {
    expect(await resolveAttackDiscoveryTactics(defaultParams)).toEqual([
      'Initial Access',
      'Execution',
    ]);
  });

  it('resolves the discovery as the calling user, by id (S3)', async () => {
    await resolveAttackDiscoveryTactics(defaultParams);

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith({
      http: defaultParams.http,
      ids: ['ad-1'],
      request: defaultParams.request,
      spaceId: 'agent-3',
    });
  });

  it('returns an empty array when the discovery carries no tactics', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([alert(undefined)]);

    expect(await resolveAttackDiscoveryTactics(defaultParams)).toEqual([]);
  });

  // `findAttackDiscoveryAlerts` answers `[]` for a discovery the caller may not read, which is what
  // keeps existence non-observable at the PND boundary.
  it('returns an empty array when the caller cannot read the discovery', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);

    expect(await resolveAttackDiscoveryTactics(defaultParams)).toEqual([]);
  });

  it('returns an empty array when the tactics field is not an array', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([alert('Initial Access')]);

    expect(await resolveAttackDiscoveryTactics(defaultParams)).toEqual([]);
  });

  it('drops blank tactics, which would fail the schema min(1)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([alert(['   ', 'Execution'])]);

    expect(await resolveAttackDiscoveryTactics(defaultParams)).toEqual(['Execution']);
  });

  it('trims surrounding whitespace', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([alert([' Execution '])]);

    expect(await resolveAttackDiscoveryTactics(defaultParams)).toEqual(['Execution']);
  });

  it('de-duplicates, so one repeated tactic cannot consume the cap', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([alert(['Execution', 'Execution'])]);

    expect(await resolveAttackDiscoveryTactics(defaultParams)).toEqual(['Execution']);
  });

  it('clips an over-long tactic to the schema bound rather than losing the whole signal', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      alert(['a'.repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH + 10)]),
    ]);

    const [tactic] = await resolveAttackDiscoveryTactics(defaultParams);

    expect(tactic).toHaveLength(PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH);
  });

  it('caps the count at the schema bound', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      alert(
        Array.from(
          { length: PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS + 5 },
          (_, index) => `tactic-${index}`
        )
      ),
    ]);

    expect(await resolveAttackDiscoveryTactics(defaultParams)).toHaveLength(
      PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS
    );
  });
});
