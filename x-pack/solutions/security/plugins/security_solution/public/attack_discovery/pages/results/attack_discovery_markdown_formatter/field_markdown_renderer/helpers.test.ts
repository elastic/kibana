/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlyoutPanelProps } from './helpers';

describe('helpers', () => {
  describe('getFlyoutPanelProps', () => {
    it('returns FlyoutPanelProps for a valid host name', () => {
      const contextId = 'contextId';
      const fieldName = 'host.name';
      const value = 'example.com';

      const flyoutPanelProps = getFlyoutPanelProps({ contextId, fieldName, value });

      expect(flyoutPanelProps).toEqual({
        id: 'host-panel',
        params: { contextID: contextId, hostName: value, scopeId: 'alerts-page' },
      });
    });

    it('returns FlyoutPanelProps for a valid user name', () => {
      const contextId = 'contextId';
      const fieldName = 'user.name';
      const value = 'administator';

      const flyoutPanelProps = getFlyoutPanelProps({ contextId, fieldName, value });

      expect(flyoutPanelProps).toEqual({
        id: 'user-panel',
        params: { contextID: contextId, userName: value, scopeId: 'alerts-page' },
      });
    });

    it('returns null for an unknown field name', () => {
      const contextId = 'contextId';
      const fieldName = 'unknown.field';
      const value = 'example';

      const flyoutPanelProps = getFlyoutPanelProps({ contextId, fieldName, value });

      expect(flyoutPanelProps).toBeNull();
    });

    it('returns null when value is not a string', () => {
      const contextId = 'contextId';
      const fieldName = 'host.name';
      const value = 123;

      const flyoutPanelProps = getFlyoutPanelProps({ contextId, fieldName, value });

      expect(flyoutPanelProps).toBeNull();
    });
  });
});
