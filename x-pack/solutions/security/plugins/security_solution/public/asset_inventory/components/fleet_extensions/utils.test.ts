/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';

import {
  getAssetInputHiddenVars,
  getAssetPolicy,
  getAssetCloudShellDefaultValue,
  getDefaultAwsCredentialsType,
  getDefaultAzureCredentialsType,
  getDefaultGcpHiddenVars,
  findVariableDef,
} from './utils';
import { getMockPolicyAWS, getPackageInfoMock } from './mocks';

describe('getPosturePolicy', () => {
  for (const [name, getPolicy, expectedVars] of [
    [
      'cloudbeat/asset_inventory_aws',
      getMockPolicyAWS,
      { 'aws.credentials.type': { value: 'assume_role' } },
    ],
  ] as const) {
    it(`updates package policy with hidden vars for ${name}`, () => {
      const inputVars = getAssetInputHiddenVars(
        name,
        {} as PackageInfo,
        SetupTechnology.AGENT_BASED,
        false
      );
      const policy = getAssetPolicy(getPolicy(), name, inputVars);

      const enabledInputs = policy.inputs.filter(
        (i) => i.type === name && i.enabled && i.streams.some((s) => s.enabled)
      );

      expect(enabledInputs.length).toBe(1);
      if (expectedVars) expect(enabledInputs[0].streams[0].vars).toMatchObject({ ...expectedVars });
      else expect(enabledInputs[0].streams[0].vars).toBe(undefined);
    });
  }

  it('updates package policy required vars (posture/deployment)', () => {
    const mockCaiAws = getMockPolicyAWS();
    expect(mockCaiAws.vars?.asset.value).toBe('asset_inventory');
    mockCaiAws.vars!.extra = { value: 'value' };
  });

  it('updates package policy with a single enabled input', () => {
    const mockCaiAws = getMockPolicyAWS();
    expect(mockCaiAws.inputs.filter((i) => i.enabled).length).toBe(1);
    expect(mockCaiAws.inputs.filter((i) => i.enabled)[0].type).toBe(
      'cloudbeat/asset_inventory_aws'
    );

    // enable all inputs of a policy
    mockCaiAws.inputs = mockCaiAws.inputs.map((i) => ({
      ...i,
      enabled: true,
      streams: i.streams.map((s) => ({ ...s, enabled: true })),
    }));

    // change input
    const policy = getAssetPolicy(mockCaiAws, 'cloudbeat/asset_inventory_azure');
    const enabledInputs = policy.inputs.filter(
      (i) => i.enabled && i.streams.some((s) => s.enabled)
    );

    expect(enabledInputs.length).toBe(1);
    expect(enabledInputs.map((v) => v.type)[0]).toBe('cloudbeat/asset_inventory_azure');
  });
});

describe('getCspmCloudShellDefaultValue', () => {
  it('should return empty string when policy_templates is missing', () => {
    const packagePolicy = { name: 'test' } as PackageInfo;
    const result = getAssetCloudShellDefaultValue(packagePolicy);
    expect(result).toBe('');
  });
  it('should return empty string when policy_templates.name is not asset_inventory', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [{ name: 'some_policy_template_name' }],
    } as PackageInfo;
    const result = getAssetCloudShellDefaultValue(packagePolicy);
    expect(result).toBe('');
  });
  it('should return empty string when policy_templates.inputs is missing', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [{ name: 'asset_inventory' }],
    } as PackageInfo;
    const result = getAssetCloudShellDefaultValue(packagePolicy);
    expect(result).toBe('');
  });
  it('should return empty string when policy_templates.inputs is empty', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'asset_inventory',
          inputs: [{}],
        },
      ],
    } as PackageInfo;
    const result = getAssetCloudShellDefaultValue(packagePolicy);
    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs is undefined', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'asset_inventory',
          inputs: undefined,
        },
      ],
    } as PackageInfo;
    const result = getAssetCloudShellDefaultValue(packagePolicy);
    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs.vars does not have cloud_shell_url', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'asset_inventory',
          inputs: [{ vars: [{ name: 'cloud_shell_url_FAKE' }] }],
        },
      ],
    } as PackageInfo;
    const result = getAssetCloudShellDefaultValue(packagePolicy);
    expect(result).toBe('');
  });
  it('should return empty string when policy_templates.inputs.varshave cloud_shell_url but no default', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'asset_inventory',
          inputs: [{ vars: [{ name: 'cloud_shell_url' }] }],
        },
      ],
    } as PackageInfo;
    const result = getAssetCloudShellDefaultValue(packagePolicy);
    expect(result).toBe('');
  });
  it('should cloud shell url when policy_templates.inputs.vars have cloud_shell_url', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: 'asset_inventory',
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
    const result = getAssetCloudShellDefaultValue(packagePolicy);
    expect(result).toBe('URL');
  });
});

describe('getDefaultAwsCredentialsType', () => {
  let packageInfo: PackageInfo;
  beforeEach(() => {
    packageInfo = {
      policy_templates: [
        {
          name: 'asset_inventory',
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
          name: 'asset_inventory',
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
          name: 'asset_inventory',
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
});

describe('getDefaultGcpHiddenVars', () => {
  let packageInfo: PackageInfo;
  beforeEach(() => {
    packageInfo = {
      policy_templates: [
        {
          name: 'asset_inventory',
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
          name: 'asset_inventory',
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
    const key = 'aws.secret_access_key';
    const result = findVariableDef(packageInfo, key);

    expect(result).toMatchObject({
      name: 'aws.secret_access_key',
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
    const key = 'aws.secret_access_key';
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
    const key = 'aws.secret_access_key';
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
    const key = 'aws.secret_access_key';
    const result = findVariableDef(packageInfo, key);

    expect(result).toBeUndefined();
  });
});
