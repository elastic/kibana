/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { ActiveAlerts } from './active_alerts';

const SLO_ID_1 = 'slo-id-1';
const SLO_ID_2 = 'slo-id-2';
const INSTANCE_A = 'host-a';
const INSTANCE_B = 'host-b';

describe('ActiveAlerts', () => {
  describe('constructor', () => {
    it('populates from entries and retrieves counts via get()', () => {
      const activeAlerts = new ActiveAlerts([
        [{ id: SLO_ID_1, instanceId: ALL_VALUE }, 5],
        [{ id: SLO_ID_1, instanceId: INSTANCE_A }, 3],
        [{ id: SLO_ID_1, instanceId: INSTANCE_B }, 2],
        [{ id: SLO_ID_2, instanceId: ALL_VALUE }, 1],
      ]);

      expect(activeAlerts.get({ id: SLO_ID_1, instanceId: ALL_VALUE })).toBe(5);
      expect(activeAlerts.get({ id: SLO_ID_1, instanceId: INSTANCE_A })).toBe(3);
      expect(activeAlerts.get({ id: SLO_ID_1, instanceId: INSTANCE_B })).toBe(2);
      expect(activeAlerts.get({ id: SLO_ID_2, instanceId: ALL_VALUE })).toBe(1);
    });

    it('returns an empty ActiveAlerts when given no entries', () => {
      const activeAlerts = new ActiveAlerts();
      expect(activeAlerts.get({ id: SLO_ID_1, instanceId: ALL_VALUE })).toBeUndefined();
    });
  });

  describe('get()', () => {
    it('returns undefined for missing entries', () => {
      const activeAlerts = new ActiveAlerts([[{ id: SLO_ID_1, instanceId: ALL_VALUE }, 5]]);

      expect(activeAlerts.get({ id: 'unknown', instanceId: ALL_VALUE })).toBeUndefined();
      expect(activeAlerts.get({ id: SLO_ID_1, instanceId: 'unknown' })).toBeUndefined();
    });

    it('treats undefined instanceId the same as ALL_VALUE', () => {
      const activeAlerts = new ActiveAlerts([[{ id: SLO_ID_1, instanceId: ALL_VALUE }, 10]]);

      expect(activeAlerts.get({ id: SLO_ID_1, instanceId: undefined as unknown as string })).toBe(
        10
      );
    });
  });
});
