/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../common/mock/endpoint';
import { ExceptionsListItemGenerator } from '../../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { useUserPrivileges as _useUserPrivileges } from '../../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { artifactListPageLabels } from '../translations';
import { TrustedAppsApiClient } from '../../../pages/trusted_apps/service/api_client';
import {
  DISABLED_ARTIFACT_TAG,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../../common/endpoint/service/artifacts';
import { useWithArtifactEnableDisable as _useWithArtifactEnableDisable } from '../hooks/use_with_artifact_enable_disable';
import { ArtifactEnabledSwitch, type ArtifactEnabledSwitchProps } from './artifact_enabled_switch';
import type { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';

jest.mock('../../../../common/components/user_privileges');
jest.mock('../hooks/use_with_artifact_enable_disable', () => ({
  ...jest.requireActual('../hooks/use_with_artifact_enable_disable'),
  useWithArtifactEnableDisable: jest.fn(),
}));

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;
const useWithArtifactEnableDisableMock = _useWithArtifactEnableDisable as jest.MockedFunction<
  typeof _useWithArtifactEnableDisable
>;

describe('ArtifactEnabledSwitch', () => {
  const generator = new ExceptionsListItemGenerator('seed');

  let render: (
    props?: Partial<ArtifactEnabledSwitchProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let setArtifactEnabled: jest.MockedFunction<
    ReturnType<typeof _useWithArtifactEnableDisable>['setArtifactEnabled']
  >;
  let onSuccess: jest.Mock;
  let item: ExceptionListItemSchema;
  let apiClient: ExceptionsListApiClient;
  let defaultProps: ArtifactEnabledSwitchProps;

  beforeEach(() => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointAuthzInitialStateMock(),
    });

    const mockedContext = createAppRootMockRenderer();
    onSuccess = jest.fn();
    item = generator.generate({
      name: 'YARA rule one',
      tags: [GLOBAL_ARTIFACT_TAG],
    });
    setArtifactEnabled = jest.fn().mockResolvedValue(item);
    useWithArtifactEnableDisableMock.mockReturnValue({
      setArtifactEnabled,
      isLoading: false,
    });
    apiClient = new TrustedAppsApiClient(mockedContext.coreStart.http);
    defaultProps = {
      item,
      apiClient,
      labels: artifactListPageLabels,
      onSuccess,
      'data-test-subj': 'enabledSwitch',
    };

    render = (props) => {
      renderResult = mockedContext.render(<ArtifactEnabledSwitch {...defaultProps} {...props} />);
      return renderResult;
    };
  });

  afterEach(() => {
    useUserPrivilegesMock.mockReset();
    useWithArtifactEnableDisableMock.mockReset();
  });

  it('renders the switch on when the artifact has no disabled tag', () => {
    render();

    expect(renderResult.getByTestId('enabledSwitch')).toBeChecked();
  });

  it('renders the switch off when the artifact has the disabled tag', () => {
    render({
      item: generator.generate({
        ...item,
        tags: [GLOBAL_ARTIFACT_TAG, DISABLED_ARTIFACT_TAG],
      }),
    });

    expect(renderResult.getByTestId('enabledSwitch')).not.toBeChecked();
  });

  it('enables the artifact when the switch is toggled on', async () => {
    const disabledItem = generator.generate({
      ...item,
      tags: [GLOBAL_ARTIFACT_TAG, DISABLED_ARTIFACT_TAG],
    });
    render({ item: disabledItem });

    fireEvent.click(renderResult.getByTestId('enabledSwitch'));

    expect(setArtifactEnabled).toHaveBeenCalledWith(true);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('disables the artifact when the switch is toggled off', async () => {
    render();

    fireEvent.click(renderResult.getByTestId('enabledSwitch'));

    expect(setArtifactEnabled).toHaveBeenCalledWith(false);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('does not call onSuccess when the update fails', async () => {
    setArtifactEnabled.mockRejectedValue(new Error('update failed'));
    render();

    fireEvent.click(renderResult.getByTestId('enabledSwitch'));

    await waitFor(() => {
      expect(setArtifactEnabled).toHaveBeenCalled();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('disables the switch when read-only', () => {
    render({ isReadOnly: true });

    expect(renderResult.getByTestId('enabledSwitch')).toBeDisabled();
  });

  it('shows a loading spinner while the artifact is being updated', () => {
    useWithArtifactEnableDisableMock.mockReturnValue({
      setArtifactEnabled,
      isLoading: true,
    });
    render();

    expect(renderResult.getByTestId('enabledSwitch-loading')).toBeInTheDocument();
    expect(renderResult.queryByTestId('enabledSwitch')).not.toBeInTheDocument();
  });

  it('shows Enabled on hover when the artifact is enabled', async () => {
    render();

    fireEvent.mouseOver(renderResult.getByTestId('enabledSwitch').parentElement as HTMLElement);

    expect(await renderResult.findByRole('tooltip')).toHaveTextContent('Enabled');
  });

  it('shows Disabled on hover when the artifact is disabled', async () => {
    render({
      item: generator.generate({
        ...item,
        tags: [GLOBAL_ARTIFACT_TAG, DISABLED_ARTIFACT_TAG],
      }),
    });

    fireEvent.mouseOver(renderResult.getByTestId('enabledSwitch').parentElement as HTMLElement);

    expect(await renderResult.findByRole('tooltip')).toHaveTextContent('Disabled');
  });

  it('shows the current value on hover instead of a privilege hint when global artifact management is not allowed', async () => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointAuthzInitialStateMock({ canManageGlobalArtifacts: false }),
    });
    render();

    fireEvent.mouseOver(renderResult.getByTestId('enabledSwitch').parentElement as HTMLElement);

    expect(await renderResult.findByRole('tooltip')).toHaveTextContent('Enabled');
    expect(renderResult.getByRole('tooltip')).not.toHaveTextContent(
      'Management of global artifacts requires additional privilege'
    );
  });
});
