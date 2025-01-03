/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculateEndpointAuthz,
  canFetchPackageAndAgentPolicies,
  getEndpointAuthzInitialState,
} from './authz';
import type { FleetAuthz } from '@kbn/fleet-plugin/common';
import { createFleetAuthzMock } from '@kbn/fleet-plugin/common/mocks';
import { createLicenseServiceMock } from '../../../license/mocks';
import type { EndpointAuthzKeyList } from '../../types/authz';
import {
  CONSOLE_RESPONSE_ACTION_COMMANDS,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL,
  type ResponseConsoleRbacControls,
} from '../response_actions/constants';
import type { Capabilities } from '@kbn/core-capabilities-common';

describe('Endpoint Authz service', () => {
  let licenseService: ReturnType<typeof createLicenseServiceMock>;
  let fleetAuthz: FleetAuthz;
  let userRoles: string[];

  const responseConsolePrivileges = CONSOLE_RESPONSE_ACTION_COMMANDS.slice().reduce<
    ResponseConsoleRbacControls[]
  >((acc, e) => {
    const item = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL[e];
    if (!acc.includes(item)) {
      acc.push(item);
    }
    return acc;
  }, []);

  beforeEach(() => {
    licenseService = createLicenseServiceMock();
    fleetAuthz = createFleetAuthzMock();
    userRoles = [];
  });

  describe('calculateEndpointAuthz()', () => {
    it('should set `canIsolateHost` to false if not proper license', () => {
      licenseService.isPlatinumPlus.mockReturnValue(false);

      expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canIsolateHost).toBe(
        false
      );
    });

    it('should set `canKillProcess` to false if not proper license', () => {
      licenseService.isEnterprise.mockReturnValue(false);

      expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canKillProcess).toBe(
        false
      );
    });

    it('should set `canSuspendProcess` to false if not proper license', () => {
      licenseService.isEnterprise.mockReturnValue(false);

      expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canSuspendProcess).toBe(
        false
      );
    });

    it('should set `canGetRunningProcesses` to false if not proper license', () => {
      licenseService.isEnterprise.mockReturnValue(false);

      expect(
        calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canGetRunningProcesses
      ).toBe(false);
    });

    it('should set `canUnIsolateHost` to true even if not proper license', () => {
      licenseService.isPlatinumPlus.mockReturnValue(false);

      expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canUnIsolateHost).toBe(
        true
      );
    });

    it(`should allow Host Isolation Exception read/delete when license is not Platinum+`, () => {
      licenseService.isPlatinumPlus.mockReturnValue(false);

      expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles)).toEqual(
        expect.objectContaining({
          canWriteHostIsolationExceptions: false,
          canAccessHostIsolationExceptions: false,
          canReadHostIsolationExceptions: true,
          canDeleteHostIsolationExceptions: true,
        })
      );
    });

    describe('Fleet', () => {
      [true, false].forEach((value) => {
        it(`should set canAccessFleet to ${value} if \`fleet.all\` is ${value}`, () => {
          fleetAuthz.fleet.all = value;
          expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canAccessFleet).toBe(
            value
          );
        });

        it(`should set canReadFleetAgents to ${value} if \`fleet.readAgents\` is ${value}`, () => {
          fleetAuthz.fleet.readAgents = value;
          expect(
            calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canReadFleetAgents
          ).toBe(value);
        });

        it(`should set canWriteFleetAgents to ${value} if \`fleet.allAgents\` is ${value}`, () => {
          fleetAuthz.fleet.allAgents = value;
          expect(
            calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canWriteFleetAgents
          ).toBe(value);
        });

        it(`should set canReadFleetAgentPolicies to ${value} if \`fleet.readAgentPolicies\` is ${value}`, () => {
          fleetAuthz.fleet.readAgentPolicies = value;
          expect(
            calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canReadFleetAgentPolicies
          ).toBe(value);
        });

        it(`should set canWriteIntegrationPolicies to ${value} if \`integrations.writeIntegrationPolicies\` is ${value}`, () => {
          fleetAuthz.integrations.writeIntegrationPolicies = value;
          expect(
            calculateEndpointAuthz(licenseService, fleetAuthz, userRoles)
              .canWriteIntegrationPolicies
          ).toBe(value);
        });
      });
    });

    it('should set canAccessEndpointManagement if not superuser', () => {
      userRoles = [];
      expect(
        calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canAccessEndpointManagement
      ).toBe(false);
    });

    it('should give canAccessEndpointManagement if superuser', () => {
      userRoles = ['superuser'];
      expect(
        calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canAccessEndpointManagement
      ).toBe(true);
      userRoles = [];
    });

    it.each<[EndpointAuthzKeyList[number], string]>([
      ['canWriteEndpointList', 'writeEndpointList'],
      ['canReadEndpointList', 'readEndpointList'],
      ['canWritePolicyManagement', 'writePolicyManagement'],
      ['canReadPolicyManagement', 'readPolicyManagement'],
      ['canWriteActionsLogManagement', 'writeActionsLogManagement'],
      ['canReadActionsLogManagement', 'readActionsLogManagement'],
      ['canAccessEndpointActionsLogManagement', 'readActionsLogManagement'],
      ['canIsolateHost', 'writeHostIsolation'],
      ['canUnIsolateHost', 'writeHostIsolation'],
      ['canKillProcess', 'writeProcessOperations'],
      ['canSuspendProcess', 'writeProcessOperations'],
      ['canGetRunningProcesses', 'writeProcessOperations'],
      ['canWriteExecuteOperations', 'writeExecuteOperations'],
      ['canWriteScanOperations', 'writeScanOperations'],
      ['canWriteFileOperations', 'writeFileOperations'],
      ['canWriteTrustedApplications', 'writeTrustedApplications'],
      ['canReadTrustedApplications', 'readTrustedApplications'],
      ['canWriteHostIsolationExceptions', 'writeHostIsolationExceptions'],
      ['canAccessHostIsolationExceptions', 'accessHostIsolationExceptions'],
      ['canReadHostIsolationExceptions', 'readHostIsolationExceptions'],
      ['canDeleteHostIsolationExceptions', 'deleteHostIsolationExceptions'],
      ['canWriteBlocklist', 'writeBlocklist'],
      ['canReadBlocklist', 'readBlocklist'],
      ['canWriteEventFilters', 'writeEventFilters'],
      ['canReadEventFilters', 'readEventFilters'],
    ])('%s should be true if `packagePrivilege.%s` is `true`', (auth) => {
      const authz = calculateEndpointAuthz(licenseService, fleetAuthz, userRoles);
      expect(authz[auth]).toBe(true);
    });

    it.each<[EndpointAuthzKeyList[number], string]>([
      ['canReadEndpointExceptions', 'showEndpointExceptions'],
      ['canWriteEndpointExceptions', 'crudEndpointExceptions'],
    ])('%s should be true if `endpointExceptionsPrivileges.%s` is `true`', (auth) => {
      const authz = calculateEndpointAuthz(licenseService, fleetAuthz, userRoles);
      expect(authz[auth]).toBe(true);
    });

    it.each<[EndpointAuthzKeyList[number], string[]]>([
      ['canWriteEndpointList', ['writeEndpointList']],
      ['canReadEndpointList', ['readEndpointList']],
      ['canWritePolicyManagement', ['writePolicyManagement']],
      ['canReadPolicyManagement', ['readPolicyManagement']],
      ['canWriteActionsLogManagement', ['writeActionsLogManagement']],
      ['canReadActionsLogManagement', ['readActionsLogManagement']],
      ['canAccessEndpointActionsLogManagement', ['readActionsLogManagement']],
      ['canIsolateHost', ['writeHostIsolation']],
      ['canUnIsolateHost', ['writeHostIsolationRelease']],
      ['canKillProcess', ['writeProcessOperations']],
      ['canSuspendProcess', ['writeProcessOperations']],
      ['canGetRunningProcesses', ['writeProcessOperations']],
      ['canWriteExecuteOperations', ['writeExecuteOperations']],
      ['canWriteScanOperations', ['writeScanOperations']],
      ['canWriteFileOperations', ['writeFileOperations']],
      ['canWriteTrustedApplications', ['writeTrustedApplications']],
      ['canReadTrustedApplications', ['readTrustedApplications']],
      ['canWriteHostIsolationExceptions', ['writeHostIsolationExceptions']],
      ['canAccessHostIsolationExceptions', ['accessHostIsolationExceptions']],
      ['canReadHostIsolationExceptions', ['readHostIsolationExceptions']],
      ['canDeleteHostIsolationExceptions', ['deleteHostIsolationExceptions']],
      ['canWriteBlocklist', ['writeBlocklist']],
      ['canReadBlocklist', ['readBlocklist']],
      ['canWriteEventFilters', ['writeEventFilters']],
      ['canReadEventFilters', ['readEventFilters']],
      // all dependent privileges are false and so it should be false
      ['canAccessResponseConsole', responseConsolePrivileges],
    ])('%s should be false if `packagePrivilege.%s` is `false`', (auth, privileges) => {
      privileges.forEach((privilege) => {
        fleetAuthz.packagePrivileges!.endpoint.actions[privilege].executePackageAction = false;
      });

      const authz = calculateEndpointAuthz(licenseService, fleetAuthz, userRoles);
      expect(authz[auth]).toBe(false);
    });

    it.each<[EndpointAuthzKeyList[number], string[]]>([
      ['canReadEndpointExceptions', ['showEndpointExceptions']],
      ['canWriteEndpointExceptions', ['crudEndpointExceptions']],
    ])('%s should be false if `endpointExceptionsPrivileges.%s` is `false`', (auth, privileges) => {
      privileges.forEach((privilege) => {
        // @ts-ignore
        fleetAuthz.endpointExceptionsPrivileges!.actions[privilege] = false;
      });

      const authz = calculateEndpointAuthz(licenseService, fleetAuthz, userRoles);
      expect(authz[auth]).toBe(false);
    });

    it.each<[EndpointAuthzKeyList[number], string[]]>([
      ['canWriteEndpointList', ['writeEndpointList']],
      ['canReadEndpointList', ['readEndpointList']],
      ['canWritePolicyManagement', ['writePolicyManagement']],
      ['canReadPolicyManagement', ['readPolicyManagement']],
      ['canWriteActionsLogManagement', ['writeActionsLogManagement']],
      ['canReadActionsLogManagement', ['readActionsLogManagement']],
      ['canAccessEndpointActionsLogManagement', ['readActionsLogManagement']],
      ['canIsolateHost', ['writeHostIsolation']],
      ['canUnIsolateHost', ['writeHostIsolationRelease']],
      ['canKillProcess', ['writeProcessOperations']],
      ['canSuspendProcess', ['writeProcessOperations']],
      ['canGetRunningProcesses', ['writeProcessOperations']],
      ['canWriteExecuteOperations', ['writeExecuteOperations']],
      ['canWriteScanOperations', ['writeScanOperations']],
      ['canWriteFileOperations', ['writeFileOperations']],
      ['canWriteTrustedApplications', ['writeTrustedApplications']],
      ['canReadTrustedApplications', ['readTrustedApplications']],
      ['canWriteHostIsolationExceptions', ['writeHostIsolationExceptions']],
      ['canAccessHostIsolationExceptions', ['accessHostIsolationExceptions']],
      ['canReadHostIsolationExceptions', ['readHostIsolationExceptions']],
      ['canWriteBlocklist', ['writeBlocklist']],
      ['canReadBlocklist', ['readBlocklist']],
      ['canWriteEventFilters', ['writeEventFilters']],
      ['canReadEventFilters', ['readEventFilters']],
      // all dependent privileges are false and so it should be false
      ['canAccessResponseConsole', responseConsolePrivileges],
    ])(
      '%s should be false if `packagePrivilege.%s` is `false` and user roles is undefined',
      (auth, privileges) => {
        privileges.forEach((privilege) => {
          fleetAuthz.packagePrivileges!.endpoint.actions[privilege].executePackageAction = false;
        });
        const authz = calculateEndpointAuthz(licenseService, fleetAuthz, undefined);
        expect(authz[auth]).toBe(false);
      }
    );

    it.each(responseConsolePrivileges)(
      'canAccessResponseConsole should be true if %s for CONSOLE privileges is true',
      (responseConsolePrivilege) => {
        // set all to false
        responseConsolePrivileges.forEach((p) => {
          fleetAuthz.packagePrivileges!.endpoint.actions[p].executePackageAction = false;
        });
        // set one of them to true
        fleetAuthz.packagePrivileges!.endpoint.actions[
          responseConsolePrivilege
        ].executePackageAction = true;

        const authz = calculateEndpointAuthz(licenseService, fleetAuthz, userRoles);

        // Having ONLY host isolation Release response action can only be true in a
        // downgrade scenario, where we allow the user to continue to release isolated
        // hosts. In that scenario, we don't show access to the response console
        if (responseConsolePrivilege === 'writeHostIsolationRelease') {
          expect(authz.canAccessResponseConsole).toBe(false);
        } else {
          expect(authz.canAccessResponseConsole).toBe(true);
        }
      }
    );
  });

  describe('getEndpointAuthzInitialState()', () => {
    it('returns expected initial state', () => {
      expect(getEndpointAuthzInitialState()).toEqual({
        canWriteSecuritySolution: false,
        canReadSecuritySolution: false,
        canAccessFleet: false,
        canReadFleetAgentPolicies: false,
        canReadFleetAgents: false,
        canWriteFleetAgents: false,
        canWriteIntegrationPolicies: false,
        canAccessEndpointActionsLogManagement: false,
        canAccessEndpointManagement: false,
        canCreateArtifactsByPolicy: false,
        canDeleteHostIsolationExceptions: false,
        canWriteEndpointList: false,
        canReadEndpointList: false,
        canWritePolicyManagement: false,
        canReadPolicyManagement: false,
        canWriteActionsLogManagement: false,
        canReadActionsLogManagement: false,
        canIsolateHost: false,
        canUnIsolateHost: false,
        canKillProcess: false,
        canSuspendProcess: false,
        canGetRunningProcesses: false,
        canAccessResponseConsole: false,
        canWriteExecuteOperations: false,
        canWriteScanOperations: false,
        canWriteFileOperations: false,
        canWriteTrustedApplications: false,
        canReadTrustedApplications: false,
        canWriteHostIsolationExceptions: false,
        canAccessHostIsolationExceptions: false,
        canReadHostIsolationExceptions: false,
        canWriteBlocklist: false,
        canReadBlocklist: false,
        canWriteEventFilters: false,
        canReadEventFilters: false,
        canReadEndpointExceptions: false,
        canWriteEndpointExceptions: false,
      });
    });
  });

  describe('canFetchPackageAndAgentPolicies()', () => {
    describe('without granular Fleet permissions', () => {
      it.each`
        readFleet | readIntegrations | readPolicyManagement | result
        ${false}  | ${false}         | ${false}             | ${false}
        ${true}   | ${false}         | ${false}             | ${false}
        ${false}  | ${true}          | ${false}             | ${false}
        ${true}   | ${true}          | ${false}             | ${true}
        ${false}  | ${false}         | ${true}              | ${true}
        ${true}   | ${false}         | ${true}              | ${true}
        ${false}  | ${true}          | ${true}              | ${true}
        ${true}   | ${true}          | ${true}              | ${true}
      `(
        'should return $result when readFleet is $readFleet, readIntegrations is $readIntegrations and readPolicyManagement is $readPolicyManagement',
        ({ readFleet, readIntegrations, readPolicyManagement, result }) => {
          const capabilities: Partial<Capabilities> = {
            siem: { readPolicyManagement },
            fleetv2: { read: readFleet },
            fleet: { read: readIntegrations },
          };

          expect(canFetchPackageAndAgentPolicies(capabilities as Capabilities)).toBe(result);
        }
      );
    });

    describe('with granular Fleet permissions', () => {
      it.each`
        readFleet | readAgentPolicies | readIntegrations | readPolicyManagement | result
        ${false}  | ${false}          | ${false}         | ${false}             | ${false}
        ${false}  | ${false}          | ${true}          | ${false}             | ${false}
        ${false}  | ${false}          | ${false}         | ${true}              | ${true}
        ${false}  | ${false}          | ${true}          | ${true}              | ${true}
        ${false}  | ${true}           | ${false}         | ${false}             | ${false}
        ${false}  | ${true}           | ${true}          | ${false}             | ${false}
        ${false}  | ${true}           | ${false}         | ${true}              | ${true}
        ${false}  | ${true}           | ${true}          | ${true}              | ${true}
        ${true}   | ${false}          | ${false}         | ${false}             | ${false}
        ${true}   | ${false}          | ${true}          | ${false}             | ${false}
        ${true}   | ${false}          | ${false}         | ${true}              | ${true}
        ${true}   | ${false}          | ${true}          | ${true}              | ${true}
        ${true}   | ${true}           | ${false}         | ${false}             | ${false}
        ${true}   | ${true}           | ${true}          | ${false}             | ${true}
        ${true}   | ${true}           | ${false}         | ${true}              | ${true}
        ${true}   | ${true}           | ${true}          | ${true}              | ${true}
      `(
        'should return $result when readAgentPolicies is $readAgentPolicies, readFleet is $readFleet, readIntegrations is $readIntegrations and readPolicyManagement is $readPolicyManagement',
        ({ readAgentPolicies, readFleet, readIntegrations, readPolicyManagement, result }) => {
          const capabilities: Partial<Capabilities> = {
            siem: { readPolicyManagement },
            fleetv2: { read: readFleet, agent_policies_read: readAgentPolicies },
            fleet: { read: readIntegrations },
          };

          expect(canFetchPackageAndAgentPolicies(capabilities as Capabilities)).toBe(result);
        }
      );
    });
  });
});
