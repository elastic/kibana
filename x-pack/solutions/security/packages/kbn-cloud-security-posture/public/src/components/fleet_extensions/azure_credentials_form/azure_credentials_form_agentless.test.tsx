/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AzureCredentialsFormAgentless } from './azure_credentials_form_agentless';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import { I18nProvider } from '@kbn/i18n-react';
import {
  getPackageInfoMock,
  getMockPolicyAWS,
  getDefaultCloudSetupConfig,
  CLOUDBEAT_AZURE,
} from '../test/mock';
import { CloudSetupProvider } from '../cloud_setup_context';
import { AZURE_CREDENTIALS_TYPE, AZURE_PROVIDER, GCP_PROVIDER } from '../constants';
import { createFleetTestRendererMock } from '@kbn/fleet-plugin/public/mock';
import {
  AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
  AZURE_INPUT_FIELDS_TEST_SUBJECTS,
  AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import userEvent from '@testing-library/user-event';
import type { CloudSetup } from '@kbn/cloud-plugin/public/types';

const getMockCloudServerless = (
  isServerlessEnabled: boolean,
  provider: string,
  cloudHost?: string
) => {
  const mock = cloudMock.createSetup();

  if (isServerlessEnabled) {
    mock.isServerlessEnabled = true;
    mock.isCloudEnabled = false;
    mock.cloudHost = cloudHost || provider;
    mock.serverless.projectId = 'test-project-id';
    mock.cloudId = undefined;
  } else {
    mock.isServerlessEnabled = false;
    mock.isCloudEnabled = true;
    mock.serverless.projectId = undefined;
    mock.cloudId =
      'my-deployment:ZXhhbXBsZS5jbG91ZC5lbGFzdGljLmNvJGRlZmF1bHQkY2liYW5hLWNvbXBvbmVudC1pZCRvdGhlcg==';
    mock.deploymentUrl = 'https://cloud.elastic.co/deployments/abc12345?region=us-west-2';
  }

  mock.cloudHost = cloudHost || provider;

  return mock;
};

const uiSettingsClient = coreMock.createStart().uiSettings;

const AzureCredentialsFormAgentlessWrapper = ({
  initialPolicy = getMockPolicyAWS(),
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
  const [newPackagePolicy, setNewPackagePolicy] = React.useState(initialPolicy);

  const updatePolicy = ({
    updatedPolicy,
    isValid,
    isExtensionLoaded,
  }: {
    updatedPolicy: NewPackagePolicy;
    isValid?: boolean;
    isExtensionLoaded?: boolean;
  }) => {
    setNewPackagePolicy(updatedPolicy);
  };
  const { AppWrapper: FleetAppWrapper } = createFleetTestRendererMock();
  const input = newPackagePolicy.inputs.find((i) => i.type === CLOUDBEAT_AZURE)!;

  return (
    <I18nProvider>
      <FleetAppWrapper>
        <CloudSetupProvider
          config={getDefaultCloudSetupConfig()}
          cloud={cloud}
          uiSettings={uiSettingsClient}
          packageInfo={packageInfo}
          packagePolicy={newPackagePolicy}
        >
          <AzureCredentialsFormAgentless
            updatePolicy={updatePolicy}
            setupTechnology={setupTechnology}
            hasInvalidRequiredVars={false}
            packageInfo={packageInfo}
            input={input}
            newPolicy={newPackagePolicy}
          />
        </CloudSetupProvider>
      </FleetAppWrapper>
    </I18nProvider>
  );
};

describe('AzureCredentialsFormAgentless', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on Serverless', () => {
    describe(' with cloud connectors ', () => {
      const serverlessMock = getMockCloudServerless(true, AZURE_PROVIDER, AZURE_PROVIDER);

      beforeEach(() => {
        // this will return true for all settings checks for  SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING
        uiSettingsClient.get = jest.fn().mockReturnValue(true);
      });

      it('shows cloud connector credential type', () => {
        render(<AzureCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

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
        render(<AzureCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

        expect(screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );

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

      it('does not show the cloud_connector option in when cloud connector is disabled', () => {
        uiSettingsClient.get = jest.fn().mockReturnValue(false);
        render(<AzureCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

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
        const serverlessMockWithDifferentHost = getMockCloudServerless(
          true,
          AZURE_PROVIDER,
          GCP_PROVIDER
        );
        render(<AzureCredentialsFormAgentlessWrapper cloud={serverlessMockWithDifferentHost} />);

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
    });
  });

  describe('on Cloud', () => {
    describe(' with cloud connectors ', () => {
      const cloudMocker = getMockCloudServerless(true, AZURE_PROVIDER, AZURE_PROVIDER);
      beforeEach(() => {
        // this will return true for all settings checks for  SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING
        uiSettingsClient.get = jest.fn().mockReturnValue(true);
      });

      it('shows cloud connector credential type', () => {
        render(<AzureCredentialsFormAgentlessWrapper cloud={cloudMocker} />);

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

      it('does not show the cloud_connector option in when cloud connector is disabled', () => {
        uiSettingsClient.get = jest.fn().mockReturnValue(false);
        render(<AzureCredentialsFormAgentlessWrapper cloud={cloudMocker} />);

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
        const cloudMockerWithDifferentHost = getMockCloudServerless(
          true,
          AZURE_PROVIDER,
          GCP_PROVIDER
        );
        render(<AzureCredentialsFormAgentlessWrapper cloud={cloudMockerWithDifferentHost} />);

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
});
