/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackageInfo, NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { createNewPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';

import {
  getInputHiddenVars,
  updatePolicyWithInputs,
  getCloudShellDefaultValue,
  findVariableDef,
  getDefaultAwsCredentialsType,
  getDefaultAwsCredentialConfig,
  getDefaultAzureCredentialsConfig,
  getDefaultGcpHiddenVars,
} from './utils';
import { AWS_PROVIDER } from './constants';

// Constants moved to Fleet - define locally for test assertions
const CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS = 'cloud_formation_cloud_connectors_template';
const ARM_TEMPLATE_URL_CLOUD_CONNECTORS = 'arm_template_cloud_connectors_url';

// Internal test mocks
const TEMPLATE_NAME = 'cspm';
const CLOUDBEAT_AWS = 'cloudbeat/cis_aws';

const getMockPolicyAWS = (): NewPackagePolicy => {
  const mockPackagePolicy = createNewPackagePolicyMock();

  const awsVarsMock = {
    access_key_id: { type: 'text' },
    secret_access_key: { type: 'password', isSecret: true },
    session_token: { type: 'text' },
    shared_credential_file: { type: 'text' },
    credential_profile_name: { type: 'text' },
    role_arn: { type: 'text' },
    'aws.credentials.type': { value: 'cloud_formation', type: 'text' },
  };

  const dataStream = { type: 'logs', dataset: 'cloud_security_posture.findings' };

  return {
    ...mockPackagePolicy,
    name: 'cloud_security_posture-policy',
    package: {
      name: 'cloud_security_posture',
      title: 'Security Posture Management',
      version: '1.1.1',
    },
    vars: {
      posture: {
        value: TEMPLATE_NAME,
        type: 'text',
      },
      deployment: { value: AWS_PROVIDER, type: 'text' },
    },
    inputs: [
      {
        type: CLOUDBEAT_AWS,
        policy_template: TEMPLATE_NAME,
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: dataStream,
            vars: awsVarsMock,
          },
        ],
      },
    ],
  } as NewPackagePolicy;
};

const getPackageInfoMock = (): PackageInfo => {
  return {
    name: TEMPLATE_NAME,
    title: 'Cloud Security Posture Management',
    version: '1.5.0',
    description: 'Test package',
    type: 'integration',
    categories: [],
    requirement: { kibana: { versions: '>=8.0.0' } },
    format_version: '1.0.0',
    release: 'ga',
    owner: { github: 'elastic/security-team' },
    latestVersion: '1.5.0',
    assets: {},
    data_streams: [
      {
        title: 'Cloud Security Posture Findings',
        streams: [
          {
            vars: [
              {
                name: 'secret_access_key',
                secret: true,
                title: 'Secret Access Key',
              },
            ],
          },
        ],
      },
    ],
    policy_templates: [
      {
        name: TEMPLATE_NAME,
        title: 'CSPM',
        description: 'Cloud Security Posture Management',
        inputs: [
          {
            type: CLOUDBEAT_AWS,
            title: 'AWS',
            description: 'AWS integration',
            vars: [
              {
                name: 'cloud_formation_template',
                default: 'http://example.com/cloud_formation_template',
              },
              {
                name: 'cloud_shell_url',
                default: 'https://example.com/cloud_shell_url',
              },
              {
                name: 'arm_template_url',
                default: 'https://example.com/arm_template_url',
              },
            ],
          },
        ],
        multiple: false,
      },
    ],
  } as unknown as PackageInfo;
};

describe('getPosturePolicy', () => {
  for (const [name, getPolicy, expectedVars] of [
    ['cloudbeat/cis_aws', getMockPolicyAWS, { 'aws.credentials.type': { value: 'assume_role' } }],
  ] as const) {
    it(`updates package policy with hidden vars for ${name}`, () => {
      const inputVars = getInputHiddenVars(
        'aws',
        {} as PackageInfo,
        TEMPLATE_NAME,
        SetupTechnology.AGENT_BASED,
        false
      );
      const policy = updatePolicyWithInputs(getPolicy(), name, inputVars);

      const enabledInputs = policy.inputs.filter(
        (i) => i.type === name && i.enabled && i.streams.some((s) => s.enabled)
      );

      expect(enabledInputs.length).toBe(1);
      if (expectedVars) expect(enabledInputs[0].streams[0].vars).toMatchObject({ ...expectedVars });
      else expect(enabledInputs[0].streams[0].vars).toBe(undefined);
    });
  }
});

describe('getCloudShellDefaultValue', () => {
  it('should return empty string when policy_templates is missing', () => {
    const packagePolicy = { name: 'test' } as PackageInfo;

    const result = getCloudShellDefaultValue(packagePolicy, TEMPLATE_NAME);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs is missing', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [{ name: TEMPLATE_NAME }],
    } as PackageInfo;

    const result = getCloudShellDefaultValue(packagePolicy, TEMPLATE_NAME);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs is empty', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: TEMPLATE_NAME,
          inputs: [{}],
        },
      ],
    } as PackageInfo;

    const result = getCloudShellDefaultValue(packagePolicy, TEMPLATE_NAME);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs is undefined', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: TEMPLATE_NAME,
          inputs: undefined,
        },
      ],
    } as PackageInfo;

    const result = getCloudShellDefaultValue(packagePolicy, TEMPLATE_NAME);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs.vars does not have cloud_shell_url', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: TEMPLATE_NAME,
          inputs: [{ vars: [{ name: 'cloud_shell_url_FAKE' }] }],
        },
      ],
    } as PackageInfo;

    const result = getCloudShellDefaultValue(packagePolicy, TEMPLATE_NAME);

    expect(result).toBe('');
  });

  it('should return empty string when policy_templates.inputs.varshave cloud_shell_url but no default', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: TEMPLATE_NAME,
          inputs: [{ vars: [{ name: 'cloud_shell_url' }] }],
        },
      ],
    } as PackageInfo;

    const result = getCloudShellDefaultValue(packagePolicy, TEMPLATE_NAME);

    expect(result).toBe('');
  });

  it('should cloud shell url when policy_templates.inputs.vars have cloud_shell_url', () => {
    const packagePolicy = {
      name: 'test',
      policy_templates: [
        {
          title: '',
          description: '',
          name: TEMPLATE_NAME,
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

    const result = getCloudShellDefaultValue(packagePolicy, TEMPLATE_NAME);

    expect(result).toBe('URL');
  });
});

describe('getDefaultAwsCredentialsType', () => {
  let packageInfo: PackageInfo;

  beforeEach(() => {
    packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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
    const result = getDefaultAwsCredentialsType(packageInfo, false, TEMPLATE_NAME, setupTechnology);

    expect(result).toBe('direct_access_keys');
  });

  it('should return "assume_role" for agent-based, when cloudformation is not available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;
    packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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

    const result = getDefaultAwsCredentialsType(
      {} as PackageInfo,
      false,
      TEMPLATE_NAME,
      setupTechnology
    );

    expect(result).toBe('assume_role');
  });

  it('should return "cloud_formation" for agent-based, when cloudformation is available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;

    const result = getDefaultAwsCredentialsType(packageInfo, false, TEMPLATE_NAME, setupTechnology);
    expect(result).toBe('cloud_formation');
  });

  it('should return "cloud_connectors" for agentless, when cloud connectors template is available and showCloudConnectors is true', () => {
    const setupTechnology = SetupTechnology.AGENTLESS;
    packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
          inputs: [
            {
              vars: [
                {
                  name: CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS,
                  default: 'http://example.com/cloud_formation_cloud_connectors_template',
                },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;

    const result = getDefaultAwsCredentialsType(packageInfo, true, TEMPLATE_NAME, setupTechnology);

    expect(result).toBe('cloud_connectors');
  });
});

describe('getDefaultAwsCredentialsConfig', () => {
  it('should return "cloud_connectors" for agentless, when cloud connectors template is available and showCloudConnectors is true', () => {
    const packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
          inputs: [
            {
              vars: [
                {
                  name: CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS,
                  default: 'http://example.com/cloud_formation_cloud_connectors_template',
                },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;
    const result = getDefaultAwsCredentialConfig({
      packageInfo,
      templateName: TEMPLATE_NAME,
      isAgentless: true,
      showCloudConnectors: true,
    });

    expect(result['aws.credentials.type'].value).toBe('cloud_connectors');
    expect(result['aws.supports_cloud_connectors'].value).toBe(true);
  });

  it('should return "cloud_formation" for agent-based, when cloud formation template is available', () => {
    const packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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
    const result = getDefaultAwsCredentialConfig({
      packageInfo,
      templateName: TEMPLATE_NAME,
      isAgentless: false,
      showCloudConnectors: false,
    });

    expect(result['aws.credentials.type'].value).toBe('cloud_formation');
    expect(result['aws.supports_cloud_connectors'].value).toBe(false);
  });

  it('should return "assume_role" for agent-based, when cloud formation template is not available', () => {
    const packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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
    const result = getDefaultAwsCredentialConfig({
      packageInfo,
      templateName: TEMPLATE_NAME,
      isAgentless: false,
      showCloudConnectors: false,
    });

    expect(result['aws.credentials.type'].value).toBe('assume_role');
    expect(result['aws.supports_cloud_connectors'].value).toBe(false);
  });

  it('should return "cloud_formation" for agent-based even with showCloudConnectors true, when cloud formation template is available', () => {
    const packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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
    const result = getDefaultAwsCredentialConfig({
      packageInfo,
      templateName: TEMPLATE_NAME,
      isAgentless: false,
      showCloudConnectors: true,
    });

    expect(result['aws.credentials.type'].value).toBe('cloud_formation');
    expect(result['aws.supports_cloud_connectors'].value).toBe(true);
  });
});
describe('getDefaultAzureCredentialsConfig', () => {
  let packageInfo: PackageInfo;

  beforeEach(() => {
    packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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
    const result = getDefaultAzureCredentialsConfig(packageInfo, TEMPLATE_NAME, true, false);

    expect(result['azure.credentials.type'].value).toBe('service_principal_with_client_secret');
  });

  it('should return "arm_template" for agent-based, when arm_template is available', () => {
    const result = getDefaultAzureCredentialsConfig(packageInfo, TEMPLATE_NAME, false, false);

    expect(result['azure.credentials.type'].value).toBe('arm_template');
  });

  it('should return "managed_identity" for agent-based, when arm_template is not available', () => {
    packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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
    const result = getDefaultAzureCredentialsConfig(packageInfo, TEMPLATE_NAME, false, false);

    expect(result['azure.credentials.type'].value).toBe('managed_identity');
  });

  it('should return "cloud_connectors" for agentless, when cloud connectors template is available and showCloudConnectors is true', () => {
    packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
          inputs: [
            {
              vars: [
                {
                  name: ARM_TEMPLATE_URL_CLOUD_CONNECTORS,
                  default: 'http://example.com/arm_template_cloud_connectors_url',
                },
              ],
            },
          ],
        },
      ],
    } as PackageInfo;

    const result = getDefaultAzureCredentialsConfig(packageInfo, TEMPLATE_NAME, true, true);

    expect(result['azure.credentials.type'].value).toBe('cloud_connectors');
    expect(result['azure.supports_cloud_connectors'].value).toBe(true);
  });

  it('should return "arm_template" for agent-based even with showCloudConnectors true, when arm_template is available', () => {
    packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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

    const result = getDefaultAzureCredentialsConfig(packageInfo, TEMPLATE_NAME, false, true);

    expect(result['azure.credentials.type'].value).toBe('arm_template');
    expect(result['azure.supports_cloud_connectors'].value).toBe(true);
  });
});

describe('getDefaultGcpHiddenVars', () => {
  let packageInfo: PackageInfo;

  beforeEach(() => {
    packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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
    const result = getDefaultGcpHiddenVars(packageInfo, TEMPLATE_NAME, setupTechnology);

    expect(result).toMatchObject({
      'gcp.credentials.type': { value: 'credentials-json', type: 'text' },
    });
  });

  it('should return google_cloud_shell setup access for agent-based if cloud_shell_url is available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;
    const result = getDefaultGcpHiddenVars(packageInfo, TEMPLATE_NAME, setupTechnology);

    expect(result).toMatchObject({
      'gcp.credentials.type': { value: 'credentials-none', type: 'text' },
    });
  });

  it('should return manual setup access for agent-based if cloud_shell_url is not available', () => {
    const setupTechnology = SetupTechnology.AGENT_BASED;
    packageInfo = {
      policy_templates: [
        {
          name: TEMPLATE_NAME,
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
