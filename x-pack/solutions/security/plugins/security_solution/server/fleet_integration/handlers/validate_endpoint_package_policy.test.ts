/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { validateEndpointPackagePolicy } from './validate_endpoint_package_policy';
import { DeviceControlAccessLevel } from '../../../common/endpoint/types';
import { EndpointIntegrationFleetError } from './errors';

describe('validateEndpointPackagePolicy', () => {
  describe('Device Control notification validation', () => {
    const createMockInput = (
      windowsAccessLevel: string,
      windowsNotificationEnabled: boolean,
      macAccessLevel: string,
      macNotificationEnabled: boolean
    ): NewPackagePolicyInput[] => {
      return [
        {
          type: 'endpoint',
          enabled: true,
          streams: [],
          config: {
            policy: {
              value: {
                windows: {
                  device_control: {
                    enabled: true,
                    usb_storage: windowsAccessLevel,
                  },
                  popup: {
                    device_control: {
                      enabled: windowsNotificationEnabled,
                      message: 'Test message',
                    },
                  },
                },
                mac: {
                  device_control: {
                    enabled: true,
                    usb_storage: macAccessLevel,
                  },
                  popup: {
                    device_control: {
                      enabled: macNotificationEnabled,
                      message: 'Test message',
                    },
                  },
                },
              },
            },
            artifact_manifest: {
              value: {},
            },
          },
        },
      ];
    };

    it('should NOT throw when notifications are enabled and access level is deny_all for both Windows and Mac', () => {
      const inputs = createMockInput(
        DeviceControlAccessLevel.deny_all,
        true,
        DeviceControlAccessLevel.deny_all,
        true
      );

      expect(() => validateEndpointPackagePolicy(inputs, 'update')).not.toThrow();
    });

    it('should NOT throw when notifications are disabled regardless of access level', () => {
      const inputs = createMockInput(
        DeviceControlAccessLevel.audit,
        false,
        DeviceControlAccessLevel.read_only,
        false
      );

      expect(() => validateEndpointPackagePolicy(inputs, 'update')).not.toThrow();
    });

    const invalidAccessLevels = [
      DeviceControlAccessLevel.audit,
      DeviceControlAccessLevel.read_only,
      DeviceControlAccessLevel.no_execute,
    ];

    describe.each(invalidAccessLevels)('when access level is %s (non-deny_all)', (accessLevel) => {
      it('should throw when Windows notifications are enabled', () => {
        const inputs = createMockInput(accessLevel, true, DeviceControlAccessLevel.deny_all, true);

        expect(() => validateEndpointPackagePolicy(inputs, 'update')).toThrow(
          EndpointIntegrationFleetError
        );
        expect(() => validateEndpointPackagePolicy(inputs, 'update')).toThrow(
          new RegExp(
            `Device Control user notifications are only supported when USB storage access level is set to deny_all\\. Current Windows access level is "${accessLevel}"\\.`
          )
        );
      });

      it('should throw when Mac notifications are enabled', () => {
        const inputs = createMockInput(DeviceControlAccessLevel.deny_all, true, accessLevel, true);

        expect(() => validateEndpointPackagePolicy(inputs, 'update')).toThrow(
          EndpointIntegrationFleetError
        );
        expect(() => validateEndpointPackagePolicy(inputs, 'update')).toThrow(
          new RegExp(
            `Device Control user notifications are only supported when USB storage access level is set to deny_all\\. Current Mac access level is "${accessLevel}"\\.`
          )
        );
      });
    });

    it('should work for create operation as well', () => {
      const inputs = createMockInput(
        DeviceControlAccessLevel.audit,
        true,
        DeviceControlAccessLevel.deny_all,
        true
      );

      expect(() => validateEndpointPackagePolicy(inputs, 'create')).toThrow(
        EndpointIntegrationFleetError
      );
    });
  });
});
