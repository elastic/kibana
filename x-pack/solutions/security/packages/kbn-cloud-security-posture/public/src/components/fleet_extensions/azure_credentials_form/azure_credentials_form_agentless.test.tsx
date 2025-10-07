/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AzureCredentialsFormAgentless } from './azure_credentials_form_agentless';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import {
  getPackageInfoMock,
  getMockPolicyAzure,
  getDefaultCloudSetupConfig,
  createCloudServerlessMock,
  CLOUDBEAT_AZURE,
} from '../test/mock';
import { AZURE_CREDENTIALS_TYPE, AZURE_PROVIDER, GCP_PROVIDER } from '../constants';
import {
  AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
  AZURE_INPUT_FIELDS_TEST_SUBJECTS,
  AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import userEvent from '@testing-library/user-event';
import type { CloudSetup } from '@kbn/cloud-plugin/public/types';
import { CloudSetupTestWrapper } from '../test/fixtures/CloudSetupTestWrapper';

const uiSettingsClient = coreMock.createStart().uiSettings;

const AzureCredentialsFormAgentlessCloudConnectorWrapper = ({ cloud }: { cloud: CloudSetup }) => {
  const baseMockPolicy = getMockPolicyAzure({
    'azure.credentials.type': { value: 'cloud_connectors' },
    'azure.credentials.tenant_id': { value: 'test-tenant-id' },
    'azure.credentials.client_id': { value: 'test-client-id' },
    azure_credentials_cloud_connector_id: { value: 'test-cloud-connector-id' },
  });
  const initialPolicy = {
    ...baseMockPolicy,
    supports_cloud_connector: true,
    cloud_connector_id: undefined,
  } as NewPackagePolicy;
  const [newPackagePolicy, setNewPackagePolicy] = React.useState(initialPolicy);

  const updatePolicy = React.useCallback(
    ({ updatedPolicy }: { updatedPolicy: NewPackagePolicy }) => {
      setNewPackagePolicy(updatedPolicy);
    },
    []
  );

  const input = newPackagePolicy.inputs.find((i) => i.type === CLOUDBEAT_AZURE)!;
  const packageInfo = getPackageInfoMock({ includeAzureTemplates: true }) as PackageInfo;

  return (
    <CloudSetupTestWrapper
      config={getDefaultCloudSetupConfig()}
      cloud={cloud}
      uiSettings={uiSettingsClient}
      packageInfo={packageInfo}
      newPolicy={newPackagePolicy}
    >
      <AzureCredentialsFormAgentless
        updatePolicy={updatePolicy}
        setupTechnology={SetupTechnology.AGENTLESS}
        hasInvalidRequiredVars={false}
        packageInfo={packageInfo}
        input={input}
        newPolicy={newPackagePolicy}
      />
    </CloudSetupTestWrapper>
  );
};

const AzureCredentialsFormAgentlessWrapper = ({
  initialPolicy = getMockPolicyAzure({
    'azure.credentials.type': { value: 'service_principal_with_client_secret' },
    'azure.credentials.tenant_id': { value: 'test-tenant-id' },
    'azure.credentials.client_id': { value: 'test-client-id' },
    'azure.credentials.client_secret': { value: 'test-client-secret' },
  }),
  packageInfo = getPackageInfoMock({ includeAzureTemplates: true }) as PackageInfo,
  setupTechnology = SetupTechnology.AGENTLESS,
  hasInvalidRequiredVars = false,
  cloud,
}: {
  initialPolicy?: NewPackagePolicy;
  packageInfo?: PackageInfo;
  setupTechnology?: SetupTechnology;
  hasInvalidRequiredVars?: boolean;
  cloud: CloudSetup;
}) => {
  // Simple state management that works
  const [newPackagePolicy, setNewPackagePolicy] = React.useState(initialPolicy);

  const updatePolicy = React.useCallback(
    ({
      updatedPolicy,
    }: {
      updatedPolicy: NewPackagePolicy;
      isValid?: boolean;
      isExtensionLoaded?: boolean;
    }) => {
      setNewPackagePolicy(updatedPolicy);
    },
    []
  );

  const input = newPackagePolicy.inputs.find((i) => i.type === CLOUDBEAT_AZURE)!;

  return (
    <CloudSetupTestWrapper
      config={getDefaultCloudSetupConfig()}
      cloud={cloud}
      uiSettings={uiSettingsClient}
      packageInfo={packageInfo}
      newPolicy={newPackagePolicy}
    >
      <AzureCredentialsFormAgentless
        updatePolicy={updatePolicy}
        setupTechnology={setupTechnology}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
        packageInfo={packageInfo}
        input={input}
        newPolicy={newPackagePolicy}
      />
    </CloudSetupTestWrapper>
  );
};

describe.skip('AzureCredentialsFormAgentless', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on Serverless', () => {
    describe(' with cloud connectors ', () => {
      const serverlessMock = createCloudServerlessMock(true, AZURE_PROVIDER, AZURE_PROVIDER);

      beforeEach(() => {
        // this will return false for all settings checks for  SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING
        uiSettingsClient.get = jest.fn().mockReturnValue(true);
      });

      it('shows cloud connector credential type', () => {
        render(<AzureCredentialsFormAgentlessCloudConnectorWrapper cloud={serverlessMock} />);

        // Verify the credential type selector is set to cloud connectors
        const credentialSelector = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        expect(credentialSelector).toHaveValue(AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS);

        // Verify cloud connector specific elements are present
        expect(
          screen.getByTestId(AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ)
        ).toBeInTheDocument();

        // For cloud connectors, we expect only the cloud connector ID field
        // CLIENT_ID and TENANT_ID are not needed for cloud connector setup
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID)
        ).toBeInTheDocument();
      });

      it('shows client, tenant and secret key when selecting service principal with client secret credential', () => {
        render(<AzureCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

        const credentialSelector = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        fireEvent.change(credentialSelector, {
          target: { value: AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET },
        });

        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET)
        ).toBeInTheDocument();
      });

      it('does not show cloud credentials when the package version is less than the enabled version', () => {
        // Simulate a package version less than the enabled version
        const packageInforWithLowerVersion = getPackageInfoMock({
          includeCloudFormationTemplates: true,
        }) as PackageInfo;

        packageInforWithLowerVersion.version = '1.0.0';

        render(
          <AzureCredentialsFormAgentlessWrapper
            packageInfo={packageInforWithLowerVersion}
            cloud={serverlessMock}
          />
        );

        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET)
        ).toBeInTheDocument();
      });

      it('shows cloud connectors when the cloudHost provider is different than azure', () => {
        const serverlessMockWithDifferentHost = createCloudServerlessMock(
          true,
          AZURE_PROVIDER,
          GCP_PROVIDER
        );
        render(
          <AzureCredentialsFormAgentlessCloudConnectorWrapper
            cloud={serverlessMockWithDifferentHost}
          />
        );

        expect(screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );
        expect(
          screen.getByTestId(AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ)
        ).toBeInTheDocument();
        // For cloud connectors, we expect only the cloud connector ID field
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID)
        ).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID)
        ).toBeInTheDocument();
      });
    });
  });

  describe('on Cloud', () => {
    describe(' with cloud connectors ', () => {
      const cloudMocker = createCloudServerlessMock(false, AZURE_PROVIDER, AZURE_PROVIDER);
      beforeEach(() => {
        // this will return false for all settings checks for  SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING
        uiSettingsClient.get = jest.fn().mockReturnValue(true);
      });

      it('shows cloud connector credential type', () => {
        render(<AzureCredentialsFormAgentlessCloudConnectorWrapper cloud={cloudMocker} />);
        expect(screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );
        expect(
          screen.getByTestId(AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ)
        ).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID)
        ).toBeInTheDocument();
      });

      it('shows client, tenant and secret key when selecting service principal with client secret credential', async () => {
        render(<AzureCredentialsFormAgentlessWrapper cloud={cloudMocker} />);
        const credentialSelector = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        userEvent.selectOptions(
          credentialSelector,
          AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
        );
        await waitFor(() =>
          expect(screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
            AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
          )
        );
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET)
        ).toBeInTheDocument();
      });

      it('does not show cloud credentials when the package version is less than the enabled version', () => {
        // Simulate a package version less than the enabled version
        const packageInforWithLowerVersion = getPackageInfoMock({
          includeCloudFormationTemplates: true,
        }) as PackageInfo;
        packageInforWithLowerVersion.version = '1.0.0';
        render(
          <AzureCredentialsFormAgentlessWrapper
            packageInfo={packageInforWithLowerVersion}
            cloud={cloudMocker}
          />
        );
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET)
        ).toBeInTheDocument();
      });
      it('shows cloud connectors when the cloudHost provider is different than azure', () => {
        const cloudMockerWithDifferentHost = createCloudServerlessMock(
          true,
          AZURE_PROVIDER,
          GCP_PROVIDER
        );
        render(
          <AzureCredentialsFormAgentlessCloudConnectorWrapper
            cloud={cloudMockerWithDifferentHost}
          />
        );
        expect(screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );
        expect(
          screen.getByTestId(AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ)
        ).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
      });
    });
  });

  describe('Component Behavior Tests', () => {
    const serverlessMock = createCloudServerlessMock(true, AZURE_PROVIDER, AZURE_PROVIDER);
    const regularCloudMock = createCloudServerlessMock(false, AZURE_PROVIDER, AZURE_PROVIDER);
    beforeEach(() => {
      uiSettingsClient.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'securitySolution:enableCloudConnector') {
          return false;
        }
        return true; // default for other settings
      });
    });

    describe('rendering with different configurations', () => {
      it('renders without credential type selector when cloud connectors are disabled', () => {
        // Use a lower version package to disable cloud connectors functionality
        const packageInfoWithLowerVersion = getPackageInfoMock({
          includeAzureTemplates: true,
        }) as PackageInfo;
        packageInfoWithLowerVersion.version = '1.0.0'; // Lower than CLOUD_CONNECTOR_ENABLED_VERSION (3.0.0)

        render(
          <AzureCredentialsFormAgentlessWrapper
            cloud={regularCloudMock}
            packageInfo={packageInfoWithLowerVersion}
          />
        );

        expect(
          screen.queryByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)
        ).not.toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET)
        ).toBeInTheDocument();
      });

      it('renders with credential type selector when cloud connectors are enabled', () => {
        uiSettingsClient.get = jest.fn().mockReturnValue(true);
        render(<AzureCredentialsFormAgentlessCloudConnectorWrapper cloud={serverlessMock} />);

        expect(screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ)
        ).toBeInTheDocument();
      });

      it('handles hasInvalidRequiredVars prop correctly', () => {
        render(
          <AzureCredentialsFormAgentlessWrapper cloud={regularCloudMock} hasInvalidRequiredVars />
        );

        // The component should still render all expected fields even with invalid vars
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET)
        ).toBeInTheDocument();
      });

      it('renders with different setup technologies', () => {
        render(
          <AzureCredentialsFormAgentlessWrapper
            cloud={regularCloudMock}
            setupTechnology={SetupTechnology.AGENTLESS}
          />
        );

        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
      });
    });

    describe('user interactions', () => {
      it('allows switching between credential types when cloud connectors enabled', async () => {
        uiSettingsClient.get = jest.fn().mockReturnValue(true);
        render(<AzureCredentialsFormAgentlessCloudConnectorWrapper cloud={serverlessMock} />);

        const credentialSelector = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);

        // Initially should be cloud connectors
        expect(credentialSelector).toHaveValue(AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS);

        // Switch to service principal
        userEvent.selectOptions(
          credentialSelector,
          AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
        );

        await waitFor(() => {
          expect(credentialSelector).toHaveValue(
            AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
          );
        });

        // Cloud connector ARM template button should not be visible for service principal
        expect(
          screen.queryByTestId(AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ)
        ).not.toBeInTheDocument();
      });

      it('maintains form state when credential type changes', async () => {
        uiSettingsClient.get = jest.fn().mockReturnValue(true);
        render(<AzureCredentialsFormAgentlessCloudConnectorWrapper cloud={serverlessMock} />);

        const credentialSelector = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);

        // Switch to service principal
        userEvent.selectOptions(
          credentialSelector,
          AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
        );

        await waitFor(() => {
          expect(credentialSelector).toHaveValue(
            AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
          );
        });

        // Form fields should be present and functional
        const clientIdField = screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID);
        const tenantIdField = screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID);
        const clientSecretField = screen.getByTestId(
          AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET
        );

        expect(clientIdField).toBeInTheDocument();
        expect(tenantIdField).toBeInTheDocument();
        expect(clientSecretField).toBeInTheDocument();
      });
    });

    describe('integration with cloud setup context', () => {
      it('responds to different cloud providers correctly', () => {
        const gcpCloudMock = createCloudServerlessMock(true, GCP_PROVIDER, GCP_PROVIDER);

        render(<AzureCredentialsFormAgentlessWrapper cloud={gcpCloudMock} />);

        // Should still render Azure fields even with different cloud provider
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET)
        ).toBeInTheDocument();
      });

      it('handles serverless vs regular cloud environments', () => {
        render(<AzureCredentialsFormAgentlessWrapper cloud={regularCloudMock} />);

        // Regular cloud should show standard Azure fields
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET)
        ).toBeInTheDocument();
      });
    });
  });
});
