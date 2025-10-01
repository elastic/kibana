/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AwsCredentialsFormAgentless } from './aws_credentials_form_agentless';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import {
  getPackageInfoMock,
  getMockPolicyAWS,
  getDefaultCloudSetupConfig,
  createCloudServerlessMock,
  CLOUDBEAT_AWS,
} from '../test/mock';
import { AWS_CREDENTIALS_TYPE, AWS_PROVIDER, GCP_PROVIDER } from '../constants';
import {
  AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
  AWS_INPUT_TEST_SUBJECTS,
  AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import userEvent from '@testing-library/user-event';
import type { CloudSetup } from '@kbn/cloud-plugin/public/types';
import { CloudSetupTestWrapper } from '../test/fixtures/CloudSetupTestWrapper';

const uiSettingsClient = coreMock.createStart().uiSettings;

const AwsCredentialsFormAgentlessWrapper = ({
  initialPolicy = getMockPolicyAWS(),
  packageInfo = getPackageInfoMock({ includeCloudFormationTemplates: true }) as PackageInfo,
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
  const input = newPackagePolicy.inputs.find((i) => i.type === CLOUDBEAT_AWS)!;

  return (
    <CloudSetupTestWrapper
      config={getDefaultCloudSetupConfig()}
      cloud={cloud}
      uiSettings={uiSettingsClient}
      packageInfo={packageInfo}
      newPolicy={newPackagePolicy}
    >
      <AwsCredentialsFormAgentless
        cloud={cloud}
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

describe('AwsCredentialsFormAgentless', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on Serverless', () => {
    // TODO: Unskip tests when we fix bugs and after FF 9/30 we have test coverage in cloud connector setup
    describe.skip(' with cloud connectors ', () => {
      const serverlessMock = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);

      beforeEach(() => {
        // this will return true for all settings checks for  SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING
        uiSettingsClient.get = jest.fn().mockReturnValue(true);
      });

      it('shows cloud connector credential type', () => {
        render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );
        expect(screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ)).toBeInTheDocument();
        expect(screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.ROLE_ARN)).toBeInTheDocument();
      });

      it('shows direct access key and secret key when selecting direct access credential', async () => {
        render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );

        const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);

        await waitFor(() =>
          expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
            AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS
          )
        );
        expect(screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ)).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_KEY_ID)
        ).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_SECRET_KEY)
        ).toBeInTheDocument();
      });

      it('shows temporary key inputs when selecting temporary credentials', async () => {
        render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );

        const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS);

        await waitFor(() =>
          expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
            AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS
          )
        );

        expect(screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_KEY_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_SECRET_KEY)
        ).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_SESSION_TOKEN)
        ).toBeInTheDocument();
      });

      it('does not show cloud credentials when the package version is less than the enabled version', () => {
        // Simulate a package version less than the enabled version
        const packageInforWithLowerVersion = getPackageInfoMock({
          includeCloudFormationTemplates: true,
        }) as PackageInfo;

        packageInforWithLowerVersion.version = '1.0.0';

        render(
          <AwsCredentialsFormAgentlessWrapper
            packageInfo={packageInforWithLowerVersion}
            cloud={serverlessMock}
          />
        );
        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).not.toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS
        );
      });

      it('should not show cloud connector option when cloudHost is not AWS', () => {
        const mockCloudGCPHost = createCloudServerlessMock(true, AWS_PROVIDER, GCP_PROVIDER);

        render(<AwsCredentialsFormAgentlessWrapper cloud={mockCloudGCPHost} />);
        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).not.toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS
        );
      });
    });
  });

  describe('on Cloud', () => {
    // TODO: Unskip tests when we fix bugs and after FF 9/30 we have test coverage in cloud connector setup

    describe.skip(' with cloud connectors ', () => {
      const cloudMocker = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);
      beforeEach(() => {
        // this will return true for all settings checks for  SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING
        uiSettingsClient.get = jest.fn().mockReturnValue(true);
      });
      it('shows cloud connector credential type', () => {
        render(<AwsCredentialsFormAgentlessWrapper cloud={cloudMocker} />);

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );
        expect(screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ)).toBeInTheDocument();
        expect(screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.ROLE_ARN)).toBeInTheDocument();
      });

      it('shows direct access key and secret key when selecting direct access credential', async () => {
        render(<AwsCredentialsFormAgentlessWrapper cloud={cloudMocker} />);

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );

        const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);

        await waitFor(() =>
          expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
            AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS
          )
        );
        expect(screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ)).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_KEY_ID)
        ).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_SECRET_KEY)
        ).toBeInTheDocument();
      });

      it('shows temporary key inputs when selecting temporary credentials', async () => {
        render(<AwsCredentialsFormAgentlessWrapper cloud={cloudMocker} />);

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );

        const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS);

        await waitFor(() =>
          expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
            AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS
          )
        );

        expect(screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_KEY_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_SECRET_KEY)
        ).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_SESSION_TOKEN)
        ).toBeInTheDocument();
      });

      it('does not show cloud credentials when the package version is less than the enabled version', () => {
        // Simulate a package version less than the enabled version
        const packageInforWithLowerVersion = getPackageInfoMock({
          includeCloudFormationTemplates: true,
        }) as PackageInfo;

        packageInforWithLowerVersion.version = '1.0.0';

        render(
          <AwsCredentialsFormAgentlessWrapper
            packageInfo={packageInforWithLowerVersion}
            cloud={cloudMocker}
          />
        );
        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).not.toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS
        );
      });

      it('should not show cloud connector option when cloudHost is not AWS', () => {
        const mockCloudGCPHost = createCloudServerlessMock(true, AWS_PROVIDER, GCP_PROVIDER);

        render(<AwsCredentialsFormAgentlessWrapper cloud={mockCloudGCPHost} />);
        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).not.toHaveValue(
          AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS
        );

        expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toHaveValue(
          AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS
        );
      });
    });
  });
});
