/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';

import {
  getMaxPackageName,
  getPostureInputHiddenVars,
  getPosturePolicy,
  getCspmCloudShellDefaultValue,
  isBelowMinVersion,
  getDefaultAwsCredentialsType,
  getDefaultAzureCredentialsType,
  getDefaultGcpHiddenVars,
  findVariableDef,
} from './utils';
import { getMockPolicyAWS, getMockPolicyK8s, getMockPolicyEKS, getPackageInfoMock } from './mocks';

describe('getPosturePolicy', () => {
  for (const [name, getPolicy, expectedVars] of [
    ['cloudbeat/cis_aws', getMockPolicyAWS, { 'aws.credentials.type': { value: 'assume_role' } }],
    ['cloudbeat/cis_eks', getMockPolicyEKS, { 'aws.credentials.type': { value: 'assume_role' } }],
    ['cloudbeat/cis_k8s', getMockPolicyK8s, null],
  ] as const) {
    it(`updates package policy with hidden vars for ${name}`, () => {
      const inputVars = getPostureInputHiddenVars(
        name,
        {} as PackageInfo,
        SetupTechnology.AGENT_BASED
      );
      const policy = getPosturePolicy(getPolicy(), name, inputVars);

      const enabledInputs = policy.inputs.filter(
        (i) => i.type === name && i.enabled && i.streams.some((s) => s.enabled)
      );

      expect(enabledInputs.length).toBe(1);
      if (expectedVars) expect(enabledInputs[0].streams[0].vars).toMatchObject({ ...expectedVars });
      else expect(enabledInputs[0].streams[0].vars).toBe(undefined);
    });
  }

  it('updates package policy required vars (posture/deployment)', () => {
    const mockCisAws = getMockPolicyAWS();
    expect(mockCisAws.vars?.posture.value).toBe('cspm');
    mockCisAws.vars!.extra = { value: 'value' };

    const policy = getPosturePolicy(mockCisAws, 'cloudbeat/cis_k8s');
    expect(policy.vars?.posture.value).toBe('kspm');
    expect(policy.vars?.deployment.value).toBe('self_managed');

    // Does not change extra vars
    expect(policy.vars?.extra.value).toBe('value');
  });

  it('updates package policy with a single enabled input', () => {
    const mockCisAws = getMockPolicyAWS();
    expect(mockCisAws.inputs.filter((i) => i.enabled).length).toBe(1);
    expect(mockCisAws.inputs.filter((i) => i.enabled)[0].type).toBe('cloudbeat/cis_aws');

    // enable all inputs of a policy
    mockCisAws.inputs = mockCisAws.inputs.map((i) => ({
      ...i,
      enabled: true,
      streams: i.streams.map((s) => ({ ...s, enabled: true })),
    }));

    // change input
    const policy = getPosturePolicy(mockCisAws, 'cloudbeat/cis_k8s');
    const enabledInputs = policy.inputs.filter(
      (i) => i.enabled && i.streams.some((s) => s.enabled)
    );

    expect(enabledInputs.length).toBe(1);
    expect(enabledInputs.map((v) => v.type)[0]).toBe('cloudbeat/cis_k8s');
  });
});

describe('getMaxPackageName', () => {
  it('should correctly increment cspm package name', () => {
    const packageName = 'cspm';
    const packagePolicies = [
      { name: 'kspm-1' },
      { name: 'kspm-2' },
      { name: 'cspm-3' },
      { name: 'vuln_mgmt-1' },
    ];

    const result = getMaxPackageName(packageName, packagePolicies);

    expect(result).toBe('cspm-4');
  });

  it('should return correctly increment vuln_mgmt package name', () => {
    const packageName = 'vuln_mgmt';
    const packagePolicies = [
      { name: 'vuln_mgmt-1' },
      { name: 'vuln_mgmt-2' },
      { name: 'vuln_mgmt-3' },
      { name: 'cspm-1' },
      { name: 'kspm-1' },
    ];

    const result = getMaxPackageName(packageName, packagePolicies);

    expect(result).toBe('vuln_mgmt-4');
  });

  it('should return correctly increment kspm package name', () => {
    const packageName = 'kspm';
    const packagePolicies = [
      { name: 'vuln_mgmt-1' },
      { name: 'vuln_mgmt-2' },
      { name: 'vuln_mgmt-3' },
      { name: 'cspm-1' },
      { name: 'kspm-1' },
    ];

    const result = getMaxPackageName(packageName, packagePolicies);

    expect(result).toBe('kspm-2');
  });

  it('should return package name with -1 when no matching package policies are found', () => {
    const packageName = 'kspm';
    const packagePolicies = [
      { name: 'vuln_mgmt-1' },
      { name: 'vuln_mgmt-2' },
      { name: 'vuln_mgmt-3' },
      { name: 'cspm-1' },
    ];

    const result = getMaxPackageName(packageName, packagePolicies);

    expect(result).toBe('kspm-1');
  });
});

describe('getCspmCloudShellDefaultValue', () => {
  it('should return empty string when policy_templates is missing', () => {
    const packagePolicy = { name: 'test' } as PackageInfo;

    const result = getCspmCloudShellDefaultValue(packagePolicy);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.name is not cspm', () => {
    const packagePolicy = { name: 'test', policy_templates: [{ name: 'kspm' }] } as PackageInfo;

    const result = getCspmCloudShellDefaultValue(packagePolicy);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs is missing', () => {
    const packagePolicy = { name: 'test', policy_templates: [{ name: 'cspm' }] } as PackageInfo;

    const result = getCspmCloudShellDefaultValue(packagePolicy);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs is empty', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'cspm',
          inputs: [{}],
        },
      ],
    } as PackageInfo;

    const result = getCspmCloudShellDefaultValue(packagePolicy);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs is undefined', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'cspm',
          inputs: undefined,
        },
      ],
    } as PackageInfo;

    const result = getCspmCloudShellDefaultValue(packagePolicy);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs.vars does not have cloud_shell_url', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'cspm',
          inputs: [{ vars: [{ name: 'cloud_shell_url_FAKE' }] }],
        },
      ],
    } as PackageInfo;

    const result = getCspmCloudShellDefaultValue(packagePolicy);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs.varshave cloud_shell_url but no default', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'cspm',
          inputs: [{ vars: [{ name: 'cloud_shell_url' }] }],
        },
      ],
    } as PackageInfo;

    const result = getCspmCloudShellDefaultValue(packagePolicy);

    expect(result).toBe('');
  });

  it('should cloud shell url when policy_templates.inputs.vars have cloud_shell_url', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'cspm',
          inputs: [
            {
              vars: [
                { name: 'cloud_shell_url_FAKE', default: 'URL_FAKE' },
                { name: 'cloud_shell_url', default: 'URL' },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;

    const result = getCspmCloudShellDefaultValue(packagePolicy);

    expect(result).toBe('URL');
  });
});

describe('isBelowMinVersion', () => {
  test.each([
    ['1.2.3', '2.0.0', true], // Version '1.2.3' is below '2.0.0', expect true
    ['1.2.3-preview20', '2.0.0', true], // Version '1.2.3-preview20' is below '2.0.0', expect true
    ['2.0.0', '1.2.3', false], // Version '2.0.0' is not below '1.2.3', expect false
    ['1.2.3', '1.2.3', false], // Version '1.2.3' is not below itself, expect false
  ])('returns expected boolean for version and minVersion', (version, minVersion, expected) => {
    const result = isBelowMinVersion(version, minVersion);

    expect(result).toBe(expected);
  });

  test.each([
    ['invalid', '1.0.0'], // Invalid version, expect error
    ['1.2', '1.0.0'], // Invalid version, expect error
    ['', '1.0.0'], // Empty version, expect error
    ['1.0.0', ''], // Empty minVersion, expect error
    ['', ''], // Empty version and minVersion, expect error
  ])('semver return errors when invalid versions are used', (version, minVersion) => {
    try {
      isBelowMinVersion(version, minVersion);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe('getDefaultAwsCredentialsType', () => {
  let packageInfo: PackageInfo;

  beforeEach(() => {
    packageInfo = {
      policy_templates: [
        {
          name: 'cspm',
          inputs: [
            {
              vars: [
                {
                  name: 'cloud_formation_template',
                  default: 'http://example.com/cloud_formation_template',
                },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;
  });

  it('should return "direct_access_key" for agentless', () => {
    const setupTechnology = SetupTechnology.AGENTLESS;
    const result = getDefaultAwsCredentialsType(packageInfo, setupTechnology);

    expect(result).toBe('direct_access_keys');
  });

  it('should return "assume_role" for agent-based, when cloudformation is not available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;
    packageInfo = {
      policy_templates: [
        {
          name: 'cspm',
          inputs: [
            {
              vars: [
                {
                  name: 'cloud_shell',
                  default: 'http://example.com/cloud_shell',
                },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;

    const result = getDefaultAwsCredentialsType({} as PackageInfo, setupTechnology);

    expect(result).toBe('assume_role');
  });

  it('should return "cloud_formation" for agent-based, when cloudformation is available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;

    const result = getDefaultAwsCredentialsType(packageInfo, setupTechnology);

    expect(result).toBe('cloud_formation');
  });
});

describe('getDefaultAzureCredentialsType', () => {
  let packageInfo: PackageInfo;

  beforeEach(() => {
    packageInfo = {
      policy_templates: [
        {
          name: 'cspm',
          inputs: [
            {
              vars: [
                {
                  name: 'arm_template_url',
                  default: 'http://example.com/arm_template_url',
                },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;
  });

  it('should return "service_principal_with_client_secret" for agentless', () => {
    const setupTechnology = SetupTechnology.AGENTLESS;
    const result = getDefaultAzureCredentialsType(packageInfo, setupTechnology);

    expect(result).toBe('service_principal_with_client_secret');
  });

  it('shold return "arm_template" for agent-based, when arm_template is available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;
    const result = getDefaultAzureCredentialsType(packageInfo, setupTechnology);

    expect(result).toBe('arm_template');
  });

  it('should return "managed_identity" for agent-based, when arm_template is not available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;
    packageInfo = {
      policy_templates: [
        {
          name: 'cspm',
          inputs: [
            {
              vars: [
                {
                  name: 'cloud_shell',
                  default: 'http://example.com/cloud_shell',
                },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;

    const result = getDefaultAzureCredentialsType(packageInfo, setupTechnology);

    expect(result).toBe('managed_identity');
  });
});

describe('getDefaultGcpHiddenVars', () => {
  let packageInfo: PackageInfo;

  beforeEach(() => {
    packageInfo = {
      policy_templates: [
        {
          name: 'cspm',
          inputs: [
            {
              vars: [
                {
                  name: 'cloud_shell_url',
                  default: 'https://example.com/cloud_shell_url',
                },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;
  });

  it('should return manual credentials-json credentials type for agentless', () => {
    const setupTechnology = SetupTechnology.AGENTLESS;
    const result = getDefaultGcpHiddenVars(packageInfo, setupTechnology);

    expect(result).toMatchObject({
      'gcp.credentials.type': { value: 'credentials-json', type: 'text' },
    });
  });

  it('should return google_cloud_shell setup access for agent-based if cloud_shell_url is available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;
    const result = getDefaultGcpHiddenVars(packageInfo, setupTechnology);

    expect(result).toMatchObject({
      'gcp.credentials.type': { value: 'credentials-none', type: 'text' },
    });
  });

  it('should return manual setup access for agent-based if cloud_shell_url is not available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;
    packageInfo = {
      policy_templates: [
        {
          name: 'cspm',
          inputs: [
            {
              vars: [
                {
                  name: 'arm_template_url',
                  default: 'https://example.com/arm_template_url',
                },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;
    const result = getDefaultGcpHiddenVars(packageInfo, setupTechnology);

    expect(result).toMatchObject({
      'gcp.credentials.type': { value: 'credentials-file', type: 'text' },
    });
  });
});

describe('findVariableDef', () => {
  it('Should return var item when key exist', () => {
    const packageInfo = getPackageInfoMock() as PackageInfo;
    const key = 'secret_access_key';
    const result = findVariableDef(packageInfo, key);

    expect(result).toMatchObject({
      name: 'secret_access_key',
      secret: true,
      title: 'Secret Access Key',
    });
  });

  it('Should return undefined when key is invalid', () => {
    const packageInfo = getPackageInfoMock() as PackageInfo;
    const key = 'invalid_access_key';
    const result = findVariableDef(packageInfo, key);

    expect(result).toBeUndefined();
  });

  it('Should return undefined when datastream is undefined', () => {
    const packageInfo = {
      data_streams: [{}],
    } as PackageInfo;
    const key = 'secret_access_key';
    const result = findVariableDef(packageInfo, key);

    expect(result).toBeUndefined();
  });

  it('Should return undefined when stream is undefined', () => {
    const packageInfo = {
      data_streams: [
        {
          title: 'Cloud Security Posture Findings',
          streams: [{}],
        },
      ],
    } as PackageInfo;
    const key = 'secret_access_key';
    const result = findVariableDef(packageInfo, key);

    expect(result).toBeUndefined();
  });

  it('Should return undefined when stream.var is invalid', () => {
    const packageInfo = {
      data_streams: [
        {
          title: 'Cloud Security Posture Findings',
          streams: [{ vars: {} }],
        },
      ],
    } as PackageInfo;
    const key = 'secret_access_key';
    const result = findVariableDef(packageInfo, key);

    expect(result).toBeUndefined();
  });
});
