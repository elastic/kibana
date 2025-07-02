/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttackDiscoveryAlertsPrivilegesParams,
  hasReadAttackDiscoveryAlertsPrivileges,
  hasReadWriteAttackDiscoveryAlertsPrivileges,
} from './index_privileges';

const getSpaceIdMock = jest.fn();
const atSpaceMock = jest.fn();
const contextMock = {
  elasticAssistant: {
    getSpaceId: getSpaceIdMock,
    checkPrivileges: () => ({ atSpace: atSpaceMock }),
  },
};
const responseMock = { forbidden: jest.fn() };

describe('Index privileges', () => {
  const defaultProps = {
    context: contextMock,
    response: responseMock,
  } as unknown as AttackDiscoveryAlertsPrivilegesParams;

  beforeEach(() => {
    jest.clearAllMocks();

    getSpaceIdMock.mockReturnValue('space1');
    atSpaceMock.mockResolvedValue({ hasAllRequested: true });
    responseMock.forbidden.mockImplementation((body) => body);
  });

  describe('hasReadAttackDiscoveryAlertsPrivileges', () => {
    it('returns success if all privileges are available', async () => {
      const results = await hasReadAttackDiscoveryAlertsPrivileges(defaultProps);
      expect(results).toEqual({ isSuccess: true });
    });

    it('returns forbidden if privileges are missing', async () => {
      atSpaceMock.mockResolvedValueOnce({ hasAllRequested: false });
      const results = await hasReadAttackDiscoveryAlertsPrivileges(defaultProps);
      expect(results).toEqual({
        isSuccess: false,
        response: {
          body: {
            message:
              'Missing [read, view_index_metadata] privileges for the [.alerts-security.attack.discovery.alerts, .internal.alerts-security.attack.discovery.alerts, .adhoc.alerts-security.attack.discovery.alerts, .internal.adhoc.alerts-security.attack.discovery.alerts] indices. Without these privileges you cannot read the Attack Discovery alerts.',
          },
        },
      });
    });

    it('calls atSpace with correct arguments', async () => {
      await hasReadAttackDiscoveryAlertsPrivileges(defaultProps);
      expect(getSpaceIdMock).toHaveBeenCalled();
      expect(atSpaceMock).toHaveBeenCalledWith('space1', {
        elasticsearch: {
          index: {
            '.adhoc.alerts-security.attack.discovery.alerts-space1': [
              'read',
              'view_index_metadata',
            ],
            '.alerts-security.attack.discovery.alerts-space1': ['read', 'view_index_metadata'],
            '.internal.adhoc.alerts-security.attack.discovery.alerts-space1': [
              'read',
              'view_index_metadata',
            ],
            '.internal.alerts-security.attack.discovery.alerts-space1': [
              'read',
              'view_index_metadata',
            ],
          },
          cluster: [],
        },
      });
    });
  });

  describe('hasReadWriteAttackDiscoveryAlertsPrivileges', () => {
    it('returns success if all privileges are available', async () => {
      const results = await hasReadWriteAttackDiscoveryAlertsPrivileges(defaultProps);
      expect(results).toEqual({ isSuccess: true });
    });

    it('returns forbidden if privileges are missing', async () => {
      atSpaceMock.mockResolvedValueOnce({ hasAllRequested: false });
      const results = await hasReadWriteAttackDiscoveryAlertsPrivileges(defaultProps);
      expect(results).toEqual({
        isSuccess: false,
        response: {
          body: {
            message:
              'Missing [read, view_index_metadata, write, maintenance] privileges for the [.alerts-security.attack.discovery.alerts, .internal.alerts-security.attack.discovery.alerts, .adhoc.alerts-security.attack.discovery.alerts, .internal.adhoc.alerts-security.attack.discovery.alerts] indices. Without these privileges you cannot create, read, update or delete the Attack Discovery alerts.',
          },
        },
      });
    });

    it('calls atSpace with correct arguments', async () => {
      await hasReadWriteAttackDiscoveryAlertsPrivileges(defaultProps);
      expect(getSpaceIdMock).toHaveBeenCalled();
      expect(atSpaceMock).toHaveBeenCalledWith('space1', {
        elasticsearch: {
          index: {
            '.adhoc.alerts-security.attack.discovery.alerts-space1': [
              'read',
              'view_index_metadata',
              'write',
              'maintenance',
            ],
            '.alerts-security.attack.discovery.alerts-space1': [
              'read',
              'view_index_metadata',
              'write',
              'maintenance',
            ],
            '.internal.adhoc.alerts-security.attack.discovery.alerts-space1': [
              'read',
              'view_index_metadata',
              'write',
              'maintenance',
            ],
            '.internal.alerts-security.attack.discovery.alerts-space1': [
              'read',
              'view_index_metadata',
              'write',
              'maintenance',
            ],
          },
          cluster: [],
        },
      });
    });
  });
});
