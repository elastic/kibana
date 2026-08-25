/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { useAzureCredentialsForm } from './azure_hooks';
import { AZURE_SETUP_FORMAT, AZURE_CREDENTIALS_TYPE } from '../constants';

// Mock the dependencies
jest.mock('../utils', () => ({
  updatePolicyWithInputs: jest.fn((policy, policyType, inputs) => ({
    ...policy,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputs: policy.inputs.map((input: any) =>
      input.type === policyType
        ? {
            ...input,
            streams: [
              {
                ...input.streams[0],
                vars: { ...input.streams[0].vars, ...inputs },
              },
            ],
          }
        : input
    ),
  })),
  getArmTemplateUrlFromPackage: jest.fn(),
}));

jest.mock('./get_azure_credentials_form_options', () => ({
  getAzureCredentialsFormOptions: jest.fn(() => ({
    managed_identity: {
      label: 'Managed Identity',
      fields: {
        'azure.credentials.managed_identity_id': { label: 'Managed Identity ID' },
      },
    },
    service_principal_with_client_secret: {
      label: 'Service Principal',
      fields: {
        'azure.credentials.client_id': { label: 'Client ID' },
        'azure.credentials.client_secret': { label: 'Client Secret' },
        'azure.credentials.tenant_id': { label: 'Tenant ID' },
      },
    },
    arm_template: {
      label: 'ARM Template',
      fields: {},
    },
  })),
  getInputVarsFields: jest.fn((input, fields) =>
    Object.keys(fields).map((fieldId) => ({
      id: fieldId,
      label: fields[fieldId].label,
      value: input.streams[0].vars?.[fieldId]?.value || '',
    }))
  ),
}));

jest.mock('../hooks/use_cloud_setup_context', () => ({
  useCloudSetup: jest.fn(() => ({
    azurePolicyType: 'azure',
    templateName: 'azure-template',
    azureOverviewPath: 'https://docs.elastic.co/azure-overview',
  })),
}));

const { useCloudSetup: mockUseCloudSetup } = jest.requireMock('../hooks/use_cloud_setup_context');
const { getArmTemplateUrlFromPackage: mockGetArmTemplateUrlFromPackage } =
  jest.requireMock('../utils');

describe('Azure Hooks', () => {
  const mockUpdatePolicy = jest.fn();
  const mockPackageInfo = {
    name: 'cloud_security_posture',
    version: '1.0.0',
    policy_templates: [],
    owner: { github: 'elastic' },
  } as unknown as PackageInfo;

  const mockNewPolicy = {
    id: 'policy-1',
    inputs: [
      {
        type: 'azure',
        streams: [
          {
            vars: {
              'azure.credentials.type': { value: AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY },
              'azure.credentials.managed_identity_id': { value: 'test-managed-id' },
            },
          },
        ],
      },
    ],
  } as unknown as NewPackagePolicy;

  const mockInput = mockNewPolicy.inputs[0];

  const defaultProps = {
    newPolicy: mockNewPolicy,
    input: mockInput,
    packageInfo: mockPackageInfo,
    updatePolicy: mockUpdatePolicy,
    isValid: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue({
      azurePolicyType: 'azure',
      templateName: 'azure-template',
      azureOverviewPath: 'https://docs.elastic.co/azure-overview',
    });
    mockGetArmTemplateUrlFromPackage.mockReturnValue('https://template.url');
  });

  describe('useAzureCredentialsForm', () => {
    it('returns correct initial state with managed identity', () => {
      const { result } = renderHook(() => useAzureCredentialsForm(defaultProps));

      expect(result.current.azureCredentialsType).toBe(AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY);
      expect(result.current.setupFormat).toBe(AZURE_SETUP_FORMAT.MANUAL);
      expect(result.current.hasArmTemplateUrl).toBe(true);
      expect(result.current.documentationLink).toBe('https://docs.elastic.co/azure-overview');
    });

    it('returns correct initial state with ARM template credentials', () => {
      const armTemplateInput = {
        ...mockInput,
        streams: [
          {
            vars: {
              'azure.credentials.type': { value: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE },
            },
          },
        ],
      } as unknown as NewPackagePolicyInput;

      const { result } = renderHook(() =>
        useAzureCredentialsForm({
          ...defaultProps,
          input: armTemplateInput,
        })
      );

      expect(result.current.azureCredentialsType).toBe(AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE);
      expect(result.current.setupFormat).toBe(AZURE_SETUP_FORMAT.ARM_TEMPLATE);
    });

    it('returns correct fields for managed identity', () => {
      const { result } = renderHook(() => useAzureCredentialsForm(defaultProps));

      expect(result.current.fields).toEqual([
        {
          id: 'azure.credentials.managed_identity_id',
          label: 'Managed Identity ID',
          value: 'test-managed-id',
        },
      ]);
    });

    it('returns correct fields for service principal', () => {
      const servicePrincipalInput = {
        ...mockInput,
        streams: [
          {
            vars: {
              'azure.credentials.type': {
                value: AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET,
              },
              'azure.credentials.client_id': { value: 'test-client-id' },
              'azure.credentials.client_secret': { value: 'test-secret' },
              'azure.credentials.tenant_id': { value: 'test-tenant-id' },
            },
          },
        ],
      } as unknown as NewPackagePolicyInput;

      const { result } = renderHook(() =>
        useAzureCredentialsForm({
          ...defaultProps,
          input: servicePrincipalInput,
        })
      );

      expect(result.current.azureCredentialsType).toBe(
        AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
      );
      expect(result.current.fields).toEqual([
        {
          id: 'azure.credentials.client_id',
          label: 'Client ID',
          value: 'test-client-id',
        },
        {
          id: 'azure.credentials.client_secret',
          label: 'Client Secret',
          value: 'test-secret',
        },
        {
          id: 'azure.credentials.tenant_id',
          label: 'Tenant ID',
          value: 'test-tenant-id',
        },
      ]);
    });

    it('handles missing credentials type by defaulting to ARM template', () => {
      const inputWithoutCredentialsType = {
        ...mockInput,
        streams: [{ vars: {} }],
      } as unknown as NewPackagePolicyInput;

      const { result } = renderHook(() =>
        useAzureCredentialsForm({
          ...defaultProps,
          input: inputWithoutCredentialsType,
        })
      );

      expect(result.current.azureCredentialsType).toBe(AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE);
    });

    it('determines setup format correctly when no ARM template URL is available', () => {
      mockGetArmTemplateUrlFromPackage.mockReturnValue('');

      const inputWithoutCredentialsType = {
        ...mockInput,
        streams: [{ vars: {} }],
      } as unknown as NewPackagePolicyInput;

      const { result } = renderHook(() =>
        useAzureCredentialsForm({
          ...defaultProps,
          input: inputWithoutCredentialsType,
        })
      );

      expect(result.current.setupFormat).toBe(AZURE_SETUP_FORMAT.MANUAL);
      expect(result.current.hasArmTemplateUrl).toBe(false);
    });

    describe('onSetupFormatChange', () => {
      it('switches from manual to ARM template format', () => {
        const { result } = renderHook(() => useAzureCredentialsForm(defaultProps));

        act(() => {
          result.current.onSetupFormatChange(AZURE_SETUP_FORMAT.ARM_TEMPLATE);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          updatedPolicy: expect.objectContaining({
            inputs: expect.arrayContaining([
              expect.objectContaining({
                streams: [
                  expect.objectContaining({
                    vars: expect.objectContaining({
                      'azure.credentials.type': {
                        value: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
                        type: 'text',
                      },
                    }),
                  }),
                ],
              }),
            ]),
          }),
        });
      });

      it('switches from ARM template to manual format', () => {
        const armTemplateInput = {
          ...mockInput,
          streams: [
            {
              vars: {
                'azure.credentials.type': { value: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE },
              },
            },
          ],
        } as unknown as NewPackagePolicyInput;

        const { result } = renderHook(() =>
          useAzureCredentialsForm({
            ...defaultProps,
            input: armTemplateInput,
          })
        );

        act(() => {
          result.current.onSetupFormatChange(AZURE_SETUP_FORMAT.MANUAL);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          updatedPolicy: expect.objectContaining({
            inputs: expect.arrayContaining([
              expect.objectContaining({
                streams: [
                  expect.objectContaining({
                    vars: expect.objectContaining({
                      'azure.credentials.type': {
                        value: AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY,
                        type: 'text',
                      },
                    }),
                  }),
                ],
              }),
            ]),
          }),
        });
      });

      it('preserves field values when switching from manual to ARM template and back', () => {
        const { result } = renderHook(() => useAzureCredentialsForm(defaultProps));

        // Switch to ARM template (should save current field values)
        act(() => {
          result.current.onSetupFormatChange(AZURE_SETUP_FORMAT.ARM_TEMPLATE);
        });

        // Switch back to manual (should restore saved field values)
        act(() => {
          result.current.onSetupFormatChange(AZURE_SETUP_FORMAT.MANUAL);
        });

        expect(mockUpdatePolicy).toHaveBeenLastCalledWith({
          updatedPolicy: expect.objectContaining({
            inputs: expect.arrayContaining([
              expect.objectContaining({
                streams: [
                  expect.objectContaining({
                    vars: expect.objectContaining({
                      'azure.credentials.managed_identity_id': { value: 'test-managed-id' },
                    }),
                  }),
                ],
              }),
            ]),
          }),
        });
      });
    });

    it('marks policy as invalid when ARM template is selected but not available', () => {
      mockGetArmTemplateUrlFromPackage.mockReturnValue('');

      const armTemplateInput = {
        ...mockInput,
        streams: [
          {
            vars: {
              'azure.credentials.type': { value: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE },
            },
          },
        ],
      } as unknown as NewPackagePolicyInput;

      renderHook(() =>
        useAzureCredentialsForm({
          ...defaultProps,
          input: armTemplateInput,
        })
      );

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        isValid: false,
        updatedPolicy: mockNewPolicy,
      });
    });

    it('does not mark policy as invalid when ARM template is available', () => {
      mockGetArmTemplateUrlFromPackage.mockReturnValue('https://template.url');

      const armTemplateInput = {
        ...mockInput,
        streams: [
          {
            vars: {
              'azure.credentials.type': { value: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE },
            },
          },
        ],
      } as unknown as NewPackagePolicyInput;

      renderHook(() =>
        useAzureCredentialsForm({
          ...defaultProps,
          input: armTemplateInput,
        })
      );

      // Should not call updatePolicy with isValid: false
      expect(mockUpdatePolicy).not.toHaveBeenCalledWith({
        isValid: false,
        updatedPolicy: mockNewPolicy,
      });
    });

    it('handles missing cloud setup context gracefully', () => {
      mockUseCloudSetup.mockReturnValue({
        azurePolicyType: undefined,
        templateName: undefined,
        azureOverviewPath: undefined,
      });

      const { result } = renderHook(() => useAzureCredentialsForm(defaultProps));

      expect(result.current.documentationLink).toBeUndefined();
    });

    describe('edge cases', () => {
      it('handles input without streams gracefully (should throw)', () => {
        const inputWithoutStreams = {
          ...mockInput,
          streams: [],
        };

        expect(() => {
          renderHook(() =>
            useAzureCredentialsForm({
              ...defaultProps,
              input: inputWithoutStreams,
            })
          );
        }).toThrow('Cannot read properties of undefined');
      });

      it('handles input with empty vars', () => {
        const inputWithEmptyVars = {
          ...mockInput,
          streams: [{ vars: {} }],
        } as unknown as NewPackagePolicyInput;

        const { result } = renderHook(() =>
          useAzureCredentialsForm({
            ...defaultProps,
            input: inputWithEmptyVars,
          })
        );

        expect(result.current.azureCredentialsType).toBe(AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE);
      });

      it('handles unknown credentials type', () => {
        const inputWithUnknownType = {
          ...mockInput,
          streams: [
            {
              vars: {
                'azure.credentials.type': { value: 'unknown-type' },
              },
            },
          ],
        } as unknown as NewPackagePolicyInput;

        const { result } = renderHook(() =>
          useAzureCredentialsForm({
            ...defaultProps,
            input: inputWithUnknownType,
          })
        );

        // Should fall back to managed identity group
        expect(result.current.fields).toEqual([
          {
            id: 'azure.credentials.managed_identity_id',
            label: 'Managed Identity ID',
            value: '',
          },
        ]);
      });

      it('handles policy updates when isValid is false initially', () => {
        mockGetArmTemplateUrlFromPackage.mockReturnValue('');

        const armTemplateInput = {
          ...mockInput,
          streams: [
            {
              vars: {
                'azure.credentials.type': { value: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE },
              },
            },
          ],
        } as unknown as NewPackagePolicyInput;

        renderHook(() =>
          useAzureCredentialsForm({
            ...defaultProps,
            input: armTemplateInput,
            isValid: false,
          })
        );

        // Should not call updatePolicy with isValid: false when already invalid
        expect(mockUpdatePolicy).not.toHaveBeenCalledWith({
          isValid: false,
          updatedPolicy: mockNewPolicy,
        });
      });
    });
  });
});
