/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageList, PackagePolicy, PackagePolicyInput } from '@kbn/fleet-plugin/common';
import { extractIntegrations } from './extract_integrations';

describe('extractIntegrations', () => {
  describe('for packages with multiple policy templates', () => {
    it('extracts package title', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
            {
              name: 'integration-b',
              title: 'Integration B',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          package_name: 'package-a',
          integration_name: 'integration-a',
          package_title: 'Package A',
        }),
        expect.objectContaining({
          package_name: 'package-a',
          integration_name: 'integration-b',
          package_title: 'Package A',
        }),
      ]);
    });

    it('extracts integration title by concatenating package and capitalized integration titles', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
            {
              name: 'integration-b',
              title: 'Integration B',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          integration_name: 'integration-a',
          integration_title: 'Package A Integration a',
        }),
        expect.objectContaining({
          integration_name: 'integration-b',
          integration_title: 'Package A Integration b',
        }),
      ]);
    });

    it('extracts latest available version', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
            {
              name: 'integration-b',
              title: 'Integration B',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          integration_name: 'integration-a',
          latest_package_version: '1.1.1',
        }),
        expect.objectContaining({
          integration_name: 'integration-b',
          latest_package_version: '1.1.1',
        }),
      ]);
    });

    it('extracts not installed integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
            {
              name: 'integration-b',
              title: 'Integration B',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          integration_name: 'integration-a',
          is_installed: false,
          is_enabled: false,
        }),
        expect.objectContaining({
          integration_name: 'integration-b',
          is_installed: false,
          is_enabled: false,
        }),
      ]);
    });

    it('extracts installed integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          status: 'installed',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
            {
              name: 'integration-b',
              title: 'Integration B',
            },
          ],
          savedObject: {
            attributes: {
              install_version: '1.0.0',
            },
          },
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          integration_name: 'integration-a',
          is_installed: true,
          is_enabled: false,
        }),
        expect.objectContaining({
          integration_name: 'integration-b',
          is_installed: true,
          is_enabled: false,
        }),
      ]);
    });

    it('extracts enabled integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          status: 'installed',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
            {
              name: 'integration-b',
              title: 'Integration B',
            },
          ],
          savedObject: {
            attributes: {
              install_version: '1.0.0',
            },
          },
        },
      ] as PackageList;
      const policies = [
        {
          inputs: [
            {
              enabled: true,
              policy_template: 'integration-a',
            },
            {
              enabled: true,
              type: 'integration-b',
            },
          ],
          package: {
            name: 'package-a',
          },
        },
      ] as PackagePolicy[];

      const result = extractIntegrations(packages, policies);

      expect(result).toEqual([
        expect.objectContaining({
          integration_name: 'integration-a',
          is_installed: true,
          is_enabled: true,
        }),
        expect.objectContaining({
          integration_name: 'integration-b',
          is_installed: true,
          is_enabled: true,
        }),
      ]);
    });

    it('extracts installed package version', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          status: 'installed',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
            {
              name: 'integration-b',
              title: 'Integration B',
            },
          ],
          savedObject: {
            attributes: {
              install_version: '1.0.0',
            },
          },
        },
      ] as PackageList;
      const policies = [
        {
          inputs: [
            {
              enabled: true,
              policy_template: 'integration-a',
            },
            {
              enabled: true,
              type: 'integration-b',
            },
          ],
          package: {
            name: 'package-a',
          },
        },
      ] as PackagePolicy[];

      const result = extractIntegrations(packages, policies);

      expect(result).toEqual([
        expect.objectContaining({
          integration_name: 'integration-a',
          installed_package_version: '1.0.0',
        }),
        expect.objectContaining({
          integration_name: 'integration-b',
          installed_package_version: '1.0.0',
        }),
      ]);
    });
  });

  describe('for packages with only one policy template', () => {
    it('extracts two integrations when package and integration names DO NOT match', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result.length).toBe(2);
    });

    it('extracts one integration when package and integration names match', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'package-a',
              title: 'Package A',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result.length).toBe(1);
    });

    it('extracts package title for both integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          package_name: 'package-a',
          package_title: 'Package A',
        }),
        expect.objectContaining({
          package_name: 'package-a',
          package_title: 'Package A',
        }),
      ]);
    });

    it('extracts integration title by concatenating package and capitalized integration titles', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toContainEqual(
        expect.objectContaining({
          integration_name: 'integration-a',
          integration_title: 'Package A Integration a',
        })
      );
    });

    it('DOES NOT extract integration title for an extra integration', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual(
        expect.not.objectContaining({
          integration_name: expect.anything(),
          integration_title: expect.anything(),
        })
      );
    });

    it('omits integration_name and integration_title when package and integration names match', () => {
      const packages = [
        {
          name: 'integration-a',
          title: 'Integration A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.not.objectContaining({
          integration_name: expect.anything(),
          integration_title: expect.anything(),
        }),
      ]);
    });

    it('extracts latest available version', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          latest_package_version: '1.1.1',
        }),
        expect.objectContaining({
          latest_package_version: '1.1.1',
        }),
      ]);
    });

    it('extracts not installed integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          is_installed: false,
          is_enabled: false,
        }),
        expect.objectContaining({
          is_installed: false,
          is_enabled: false,
        }),
      ]);
    });

    it('extracts installed integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          status: 'installed',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
          savedObject: {
            attributes: {
              install_version: '1.0.0',
            },
          },
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          is_installed: true,
          is_enabled: false,
        }),
        expect.objectContaining({
          is_installed: true,
          is_enabled: false,
        }),
      ]);
    });

    it('extracts enabled integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          status: 'installed',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
          savedObject: {
            attributes: {
              install_version: '1.0.0',
            },
          },
        },
      ] as PackageList;
      const policies = [
        {
          inputs: [
            {
              enabled: true,
              policy_template: 'integration-a',
            },
          ],
          package: {
            name: 'package-a',
          },
        },
      ] as PackagePolicy[];

      const result = extractIntegrations(packages, policies);

      expect(result).toEqual([
        expect.objectContaining({
          is_installed: true,
          is_enabled: true,
        }),
        expect.objectContaining({
          is_installed: true,
          is_enabled: true,
        }),
      ]);
    });

    it('extracts installed package version', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          status: 'installed',
          policy_templates: [
            {
              name: 'integration-a',
              title: 'Integration A',
            },
          ],
          savedObject: {
            attributes: {
              install_version: '1.0.0',
            },
          },
        },
      ] as PackageList;
      const policies = [
        {
          inputs: [
            {
              enabled: true,
              policy_template: 'integration-a',
            },
          ],
          package: {
            name: 'package-a',
          },
        },
      ] as PackagePolicy[];

      const result = extractIntegrations(packages, policies);

      expect(result).toEqual([
        expect.objectContaining({
          installed_package_version: '1.0.0',
        }),
        expect.objectContaining({
          installed_package_version: '1.0.0',
        }),
      ]);
    });
  });

  describe('for packages without policy templates', () => {
    it('extracts package title', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          package_name: 'package-a',
          package_title: 'Package A',
        }),
      ]);
    });

    it('omits integration_name and integration_title', () => {
      const packages = [
        {
          name: 'integration-a',
          title: 'Integration A',
          version: '1.1.1',
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.not.objectContaining({
          integration_name: expect.anything(),
          integration_title: expect.anything(),
        }),
      ]);
    });

    it('extracts latest available version', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          latest_package_version: '1.1.1',
        }),
      ]);
    });

    it('extracts not installed integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          is_installed: false,
          is_enabled: false,
        }),
      ]);
    });

    it('extracts installed integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          status: 'installed',
          savedObject: {
            attributes: {
              install_version: '1.0.0',
            },
          },
        },
      ] as PackageList;

      const result = extractIntegrations(packages, []);

      expect(result).toEqual([
        expect.objectContaining({
          is_installed: true,
          is_enabled: false,
        }),
      ]);
    });

    it('extracts enabled integrations', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          status: 'installed',
          savedObject: {
            attributes: {
              install_version: '1.0.0',
            },
          },
        },
      ] as PackageList;
      const policies = [
        {
          package: {
            name: 'package-a',
          },
          inputs: [] as PackagePolicyInput[],
        },
      ] as PackagePolicy[];

      const result = extractIntegrations(packages, policies);

      expect(result).toEqual([
        expect.objectContaining({
          is_installed: true,
          is_enabled: true,
        }),
      ]);
    });

    it('extracts installed package version', () => {
      const packages = [
        {
          name: 'package-a',
          title: 'Package A',
          version: '1.1.1',
          status: 'installed',
          savedObject: {
            attributes: {
              install_version: '1.0.0',
            },
          },
        },
      ] as PackageList;
      const policies = [
        {
          package: {
            name: 'package-a',
          },
          inputs: [] as PackagePolicyInput[],
        },
      ] as PackagePolicy[];

      const result = extractIntegrations(packages, policies);

      expect(result).toEqual([
        expect.objectContaining({
          installed_package_version: '1.0.0',
        }),
      ]);
    });
  });
});
