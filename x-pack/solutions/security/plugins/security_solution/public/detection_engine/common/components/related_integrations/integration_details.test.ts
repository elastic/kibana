/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateIntegrationDetails } from './integration_details';

describe('Integration Details', () => {
  describe('calculateIntegrationDetails', () => {
    test('it returns a the correct integrationDetails', () => {
      const integrationDetails = calculateIntegrationDetails([], []);

      expect(integrationDetails.length).toEqual(0);
    });

    describe('version is correctly computed', () => {
      test('Unknown integration that does not exist', () => {
        const integrationDetails = calculateIntegrationDetails(
          [
            {
              package: 'foo1',
              version: '~1.2.3',
            },
            {
              package: 'foo2',
              version: '^1.2.3',
            },
            {
              package: 'foo3',
              version: '1.2.x',
            },
          ],
          []
        );

        expect(integrationDetails[0].targetVersion).toEqual('1.2.3');
        expect(integrationDetails[1].targetVersion).toEqual('1.2.3');
        expect(integrationDetails[2].targetVersion).toEqual('1.2.0');
      });

      test('Integration that is not installed', () => {
        const integrationDetails = calculateIntegrationDetails(
          [
            {
              package: 'aws',
              integration: 'route53',
              version: '~1.2.3',
            },
            {
              package: 'system',
              version: '^1.2.3',
            },
          ],
          []
        );

        expect(integrationDetails[0].targetVersion).toEqual('1.2.3');
        expect(integrationDetails[1].targetVersion).toEqual('1.2.3');
      });

      test('Integration that is installed, and its version matches required version', () => {
        const integrationDetails = calculateIntegrationDetails(
          [
            {
              package: 'aws',
              integration: 'route53',
              version: '^1.2.3',
            },
            {
              package: 'system',
              version: '~1.2.3',
            },
          ],
          [
            {
              package_name: 'aws',
              package_title: 'AWS',
              latest_package_version: '1.3.0',
              installed_package_version: '1.3.0',
              integration_name: 'route53',
              integration_title: 'AWS Route 53',
              is_installed: true,
              is_enabled: false,
            },
            {
              package_name: 'system',
              package_title: 'System',
              latest_package_version: '1.2.5',
              installed_package_version: '1.2.5',
              is_installed: true,
              is_enabled: true,
            },
          ]
        );

        expect(integrationDetails[0].installationStatus.isKnown).toEqual(true);
        if (integrationDetails[0].installationStatus.isKnown) {
          expect(integrationDetails[0].installationStatus.isVersionMismatch).toEqual(false);
          expect(integrationDetails[0].installationStatus.installedVersion).toEqual('1.3.0');
        }

        expect(integrationDetails[1].installationStatus.isKnown).toEqual(true);
        if (integrationDetails[1].installationStatus.isKnown) {
          expect(integrationDetails[1].installationStatus.isVersionMismatch).toEqual(false);
          expect(integrationDetails[1].installationStatus.installedVersion).toEqual('1.2.5');
        }
      });

      test('Integration that is installed, and its version is less than required version', () => {
        const integrationDetails = calculateIntegrationDetails(
          [
            {
              package: 'aws',
              integration: 'route53',
              version: '~1.2.3',
            },
            {
              package: 'system',
              version: '^1.2.3',
            },
          ],
          [
            {
              package_name: 'aws',
              package_title: 'AWS',
              latest_package_version: '1.2.0',
              installed_package_version: '1.2.0',
              integration_name: 'route53',
              integration_title: 'AWS Route 53',
              is_installed: true,
              is_enabled: false,
            },
            {
              package_name: 'system',
              package_title: 'System',
              latest_package_version: '1.2.2',
              installed_package_version: '1.2.2',
              is_installed: true,
              is_enabled: true,
            },
          ]
        );

        expect(integrationDetails[0].targetVersion).toEqual('1.2.3');
        expect(integrationDetails[1].targetVersion).toEqual('1.2.3');
      });

      test('Integration that is installed, and its version is greater than required version', () => {
        const integrationDetails = calculateIntegrationDetails(
          [
            {
              package: 'aws',
              integration: 'route53',
              version: '^1.2.3',
            },
            {
              package: 'system',
              version: '~1.2.3',
            },
          ],
          [
            {
              package_name: 'aws',
              package_title: 'AWS',
              latest_package_version: '2.0.1',
              installed_package_version: '2.0.1',
              integration_name: 'route53',
              integration_title: 'AWS Route 53',
              is_installed: true,
              is_enabled: false,
            },
            {
              package_name: 'system',
              package_title: 'System',
              latest_package_version: '1.3.0',
              installed_package_version: '1.3.0',
              is_installed: true,
              is_enabled: true,
            },
          ]
        );

        expect(integrationDetails[0].targetVersion).toEqual('1.2.3');
        expect(integrationDetails[1].targetVersion).toEqual('1.2.3');
      });
    });
  });
});
