/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

import { getMockAttackDiscoveryAlerts } from '../../mock/mock_attack_discovery_alerts';
import { isAttackDiscoveryAlert } from '.';

describe('isAttackDiscoveryAlert', () => {
  it('returns true for an AttackDiscoveryAlert object', () => {
    const alert = getMockAttackDiscoveryAlerts()[0]; // Use imported mock

    expect(isAttackDiscoveryAlert(alert)).toBe(true);
  });

  it('returns false for an AttackDiscovery object', () => {
    const discovery: AttackDiscovery = {
      id: 'discovery-1',
      timestamp: '2023-10-01T00:00:00Z',
      alertIds: [],
      detailsMarkdown: 'Some details',
      summaryMarkdown: 'Some summary',
      title: 'Discovery Title',
    };

    expect(isAttackDiscoveryAlert(discovery)).toBe(false);
  });

  it('returns false for an object without the generationUuid property', () => {
    const obj = {
      id: 'obj-1',
      name: 'Test Object',
      timestamp: '2023-10-01T00:00:00Z',
    };

    expect(isAttackDiscoveryAlert(obj as unknown as AttackDiscovery | AttackDiscoveryAlert)).toBe(
      false
    );
  });
});
