/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_APP_IDS,
  OBSERVABILITY_AGENT_ID,
  OBSERVABILITY_SESSION_TAG,
} from './observability_apps';

describe('Observability App IDs', () => {
  describe('OBSERVABILITY_APP_IDS', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(OBSERVABILITY_APP_IDS)).toBe(true);
      expect(OBSERVABILITY_APP_IDS.length).toBeGreaterThan(0);
    });

    it('should contain essential Observability apps', () => {
      const coreApps = ['apm', 'slo', 'synthetics', 'observability-overview', 'logs', 'metrics'];
      coreApps.forEach((appId) => {
        expect(OBSERVABILITY_APP_IDS).toContain(appId);
      });
    });
  });

  describe('OBSERVABILITY_AGENT_ID', () => {
    it('should be the correct agent ID', () => {
      expect(OBSERVABILITY_AGENT_ID).toBe('observability.agent');
    });
  });

  describe('OBSERVABILITY_SESSION_TAG', () => {
    it('should be the correct session tag', () => {
      expect(OBSERVABILITY_SESSION_TAG).toBe('observability');
    });
  });
});
