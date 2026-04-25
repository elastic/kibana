/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAssistantContext } from '@kbn/elastic-assistant';

import { ALERT_ATTACK_IDS } from '../../../../common/field_maps/field_names';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { getMockAttackDiscoveryAlerts } from '../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import { useAttackGroupHandler } from './use_attack_group_handler';

jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: jest.fn(),
}));

jest.mock('../../../attack_discovery/pages/use_find_attack_discoveries', () => ({
  useFindAttackDiscoveries: jest.fn(),
}));

const mockAttacks = getMockAttackDiscoveryAlerts();

describe('useAttackGroupHandler', () => {
  beforeEach(() => {
    (useAssistantContext as jest.Mock).mockReturnValue({
      assistantAvailability: { isAssistantEnabled: true },
      http: {},
    });
  });

  it('should return isLoading true when fetching attacks', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useAttackGroupHandler({ attackIds: ['1'] }));

    expect(result.current.isLoading).toBe(true);
  });

  it('should return isLoading false when attacks are loaded', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      data: { data: mockAttacks },
      isLoading: false,
    });

    const { result } = renderHook(() => useAttackGroupHandler({ attackIds: ['1'] }));

    expect(result.current.isLoading).toBe(false);
  });

  describe('getAttack', () => {
    beforeEach(() => {
      (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
        data: { data: mockAttacks },
        isLoading: false,
      });
    });

    it('should return undefined if selectedGroup is not ALERT_ATTACK_IDS', () => {
      const { result } = renderHook(() =>
        useAttackGroupHandler({ attackIds: mockAttacks.map((a) => a.id) })
      );

      const attack = result.current.getAttack('some.other.field', {
        key: mockAttacks[0].id,
        doc_count: 1,
      });
      expect(attack).toBeUndefined();
    });

    it('should return undefined if bucket key is an array with length > 1', () => {
      const { result } = renderHook(() =>
        useAttackGroupHandler({ attackIds: mockAttacks.map((a) => a.id) })
      );

      const attack = result.current.getAttack(ALERT_ATTACK_IDS, {
        key: ['id1', 'id2'],
        doc_count: 1,
      });
      expect(attack).toBeUndefined();
    });

    it('should return the attack if found by ID (string key)', () => {
      const { result } = renderHook(() =>
        useAttackGroupHandler({ attackIds: mockAttacks.map((a) => a.id) })
      );

      const targetAttack = mockAttacks[0];
      const attack = result.current.getAttack(ALERT_ATTACK_IDS, {
        key: targetAttack.id,
        doc_count: 1,
      });
      expect(attack).toEqual(targetAttack);
    });

    it('should return the attack if found by ID (array key with length 1)', () => {
      const { result } = renderHook(() =>
        useAttackGroupHandler({ attackIds: mockAttacks.map((a) => a.id) })
      );

      const targetAttack = mockAttacks[0];
      const attack = result.current.getAttack(ALERT_ATTACK_IDS, {
        key: [targetAttack.id],
        doc_count: 1,
      });
      expect(attack).toEqual(targetAttack);
    });

    it('should return undefined if attack is not found', () => {
      const { result } = renderHook(() =>
        useAttackGroupHandler({ attackIds: mockAttacks.map((a) => a.id) })
      );

      const attack = result.current.getAttack(ALERT_ATTACK_IDS, {
        key: 'non-existent-id',
        doc_count: 1,
      });
      expect(attack).toBeUndefined();
    });

    it('should return undefined when attacks are loading or empty', () => {
      (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { result } = renderHook(() => useAttackGroupHandler({ attackIds: ['1'] }));

      const attack = result.current.getAttack(ALERT_ATTACK_IDS, {
        key: '1',
        doc_count: 1,
      });
      expect(attack).toBeUndefined();
    });
  });
});
