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
import { TrustedAppsApiClient } from '../../../pages/trusted_apps/service/api_client';
import {
  useArtifactActionsDisabled as _useArtifactActionsDisabled,
  useGetArtifact as _useGetArtifact,
} from '../../../hooks/artifacts';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { artifactListPageLabels } from '../translations';
import { useWithArtifactEnableDisable as _useWithArtifactEnableDisable } from '../hooks/use_with_artifact_enable_disable';
import { useArtifactAssignedPolicies as _useArtifactAssignedPolicies } from '../hooks/use_artifact_assigned_policies';
import { useUserPrivileges as _useUserPrivileges } from '../../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { buildPerPolicyTag } from '../../../../../common/endpoint/service/artifacts/utils';
import type { MenuItemPropsByPolicyId } from '../../artifact_entry_card';
import type { ArtifactViewModeComponentProps } from '../types';
import {
  ArtifactViewFlyout,
  type ArtifactViewFlyoutProps,
  type ArtifactViewFlyoutTakeAction,
} from './artifact_view_flyout';
import {
  DISABLED_ARTIFACT_TAG,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../../common/endpoint/service/artifacts';

jest.mock('../../../hooks/artifacts', () => ({
  useGetArtifact: jest.fn(),
  useArtifactActionsDisabled: jest.fn(),
}));

jest.mock('../hooks/use_with_artifact_enable_disable', () => ({
  ...jest.requireActual('../hooks/use_with_artifact_enable_disable'),
  useWithArtifactEnableDisable: jest.fn(),
}));
jest.mock('../hooks/use_artifact_assigned_policies');
jest.mock('../../../../common/components/user_privileges');

const useGetArtifactMock = _useGetArtifact as jest.Mock;
const useArtifactActionsDisabledMock = _useArtifactActionsDisabled as jest.Mock;
const useWithArtifactEnableDisableMock = _useWithArtifactEnableDisable as jest.Mock;
const useArtifactAssignedPoliciesMock = _useArtifactAssignedPolicies as jest.Mock;
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

type ArtifactViewFlyoutRenderProps = {
  labels?: ArtifactViewFlyoutProps['labels'];
  allowCardEditAction?: boolean;
  allowCardDeleteAction?: boolean;
  onTakeAction?: ArtifactViewFlyoutTakeAction;
} & (
  | {
      showEnabledSwitch?: false;
    }
  | {
      showEnabledSwitch: true;
      onEnabledChangeRefresh: () => Promise<void>;
    }
);

describe('ArtifactViewFlyout', () => {
  const generator = new ExceptionsListItemGenerator('seed');

  let mockedContext: AppContextTestRender;
  let render: (props?: ArtifactViewFlyoutRenderProps) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let onClose: jest.Mock;
  let onEnabledChangeRefresh: jest.Mock;
  let refetchArtifact: jest.Mock;
  let setArtifactEnabled: jest.Mock;
  let item: ExceptionListItemSchema;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    onClose = jest.fn();
    onEnabledChangeRefresh = jest.fn().mockResolvedValue(undefined);
    refetchArtifact = jest.fn().mockResolvedValue(undefined);
    setArtifactEnabled = jest.fn().mockResolvedValue(undefined);
    item = generator.generate({
      name: 'Signature one',
      description: 'Detects a thing',
      os_types: ['windows', 'linux', 'macos'],
      updated_by: 'jane.doe',
      updated_at: '2025-12-05T12:00:00.000Z',
      tags: [GLOBAL_ARTIFACT_TAG],
    });
    useGetArtifactMock.mockReturnValue({ data: item, error: null, refetch: refetchArtifact });
    useArtifactActionsDisabledMock.mockReturnValue({
      isDisabled: false,
      disabledTooltip: undefined,
    });
    useWithArtifactEnableDisableMock.mockReturnValue({
      setArtifactEnabled,
      isLoading: false,
    });
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointAuthzInitialStateMock(),
    });
    useArtifactAssignedPoliciesMock.mockReturnValue({
      policies: {},
      isLoading: false,
    });

    const ViewModeComponent = ({ item: viewedItem }: ArtifactViewModeComponentProps) => (
      <div data-test-subj="viewModeComponent">{viewedItem.name}</div>
    );

    render = (props = {}) => {
      const sharedProps = {
        apiClient: new TrustedAppsApiClient(mockedContext.coreStart.http),
        itemId: 'item-1',
        onClose,
        ViewModeComponent,
        'data-test-subj': 'viewFlyout',
        ...(props.labels ? { labels: props.labels } : {}),
        ...(props.allowCardDeleteAction !== undefined
          ? { allowCardDeleteAction: props.allowCardDeleteAction }
          : {}),
        ...(props.onTakeAction ? { onTakeAction: props.onTakeAction } : {}),
        allowCardEditAction: props.allowCardEditAction ?? true,
      };

      renderResult = mockedContext.render(
        props.showEnabledSwitch ? (
          <ArtifactViewFlyout
            {...sharedProps}
            showEnabledSwitch
            onEnabledChangeRefresh={props.onEnabledChangeRefresh}
          />
        ) : (
          <ArtifactViewFlyout {...sharedProps} />
        )
      );
      return renderResult;
    };
  });

  it('shows the artifact name, last updated date, operating systems, and description', () => {
    render();

    expect(renderResult.getByTestId('viewFlyout-title')).toHaveTextContent('Signature one');
    expect(renderResult.getByTestId('viewFlyout-lastUpdated')).toHaveTextContent(
      /Last updated: Dec 5, 2025 @ 12:00:00/
    );
    expect(renderResult.getByTestId('viewFlyout-os-osBadge-windows')).toHaveTextContent('Windows');
    expect(renderResult.getByTestId('viewFlyout-os-osBadge-linux')).toHaveTextContent('Linux');
    expect(renderResult.getByTestId('viewFlyout-os-osBadge-macos')).toHaveTextContent('Mac');
    expect(renderResult.getByTestId('viewFlyout-infoBlock')).toHaveTextContent('Updated by');
    expect(renderResult.getByTestId('viewFlyout-updatedByAvatar')).toBeInTheDocument();
    expect(renderResult.getByTestId('viewFlyout-description')).toHaveTextContent('Detects a thing');
    expect(renderResult.getByTestId('viewFlyout-definitionTitle')).toHaveTextContent('Definition');
    expect(renderResult.getByTestId('viewModeComponent')).toHaveTextContent('Signature one');
    expect(renderResult.queryByTestId('viewFlyout-enabledSwitch')).not.toBeInTheDocument();
    expect(renderResult.getByTestId('viewFlyout-policyAssignmentTitle')).toHaveTextContent(
      'Policy assignment'
    );
    expect(renderResult.getByTestId('viewFlyout-policyAssignment-global')).toHaveTextContent(
      'Applied globally.'
    );
  });

  it('shows the enabled switch before Updated by when showEnabledSwitch is true', () => {
    render({
      showEnabledSwitch: true,
      allowCardEditAction: true,
      onEnabledChangeRefresh,
      labels: artifactListPageLabels,
    });

    const infoBlock = renderResult.getByTestId('viewFlyout-infoBlock');
    const enabledIndex = infoBlock.textContent?.indexOf('Enabled') ?? -1;
    const updatedByIndex = infoBlock.textContent?.indexOf('Updated by') ?? -1;

    expect(renderResult.getByTestId('viewFlyout-enabledLabel')).toHaveTextContent('Enabled');
    expect(renderResult.getByTestId('viewFlyout-enabledSwitch')).toBeEnabled();
    expect(renderResult.getByTestId('viewFlyout-enabledSwitch')).toBeChecked();
    expect(renderResult.getByTestId('viewFlyout-infoBlockDivider')).toBeInTheDocument();
    expect(enabledIndex).toBeGreaterThanOrEqual(0);
    expect(enabledIndex).toBeLessThan(updatedByIndex);
  });

  it('shows the enabled switch off when the artifact is disabled', () => {
    item.tags = [GLOBAL_ARTIFACT_TAG, DISABLED_ARTIFACT_TAG];
    useGetArtifactMock.mockReturnValue({ data: item, error: null, refetch: refetchArtifact });

    render({
      showEnabledSwitch: true,
      allowCardEditAction: true,
      onEnabledChangeRefresh,
      labels: artifactListPageLabels,
    });

    expect(renderResult.getByTestId('viewFlyout-enabledSwitch')).not.toBeChecked();
  });

  it('disables the enabled switch when edit is not allowed', () => {
    render({
      showEnabledSwitch: true,
      allowCardEditAction: false,
      onEnabledChangeRefresh,
      labels: artifactListPageLabels,
    });

    expect(renderResult.getByTestId('viewFlyout-enabledSwitch')).toBeDisabled();
  });

  it('refreshes the artifact and the list after the enabled switch is toggled', async () => {
    let resolveRefresh: (() => void) | undefined;
    onEnabledChangeRefresh.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      })
    );
    render({
      showEnabledSwitch: true,
      allowCardEditAction: true,
      labels: artifactListPageLabels,
      onEnabledChangeRefresh,
    });

    fireEvent.click(renderResult.getByTestId('viewFlyout-enabledSwitch'));

    await waitFor(() => {
      expect(setArtifactEnabled).toHaveBeenCalledWith(false);
      expect(renderResult.getByTestId('viewFlyout-enabledSwitch-loading')).toBeInTheDocument();
    });

    resolveRefresh?.();

    await waitFor(() => {
      expect(refetchArtifact).toHaveBeenCalled();
      expect(onEnabledChangeRefresh).toHaveBeenCalled();
      expect(
        renderResult.queryByTestId('viewFlyout-enabledSwitch-loading')
      ).not.toBeInTheDocument();
    });
  });

  it('refreshes the artifact when enabling fails with a conflict', async () => {
    setArtifactEnabled.mockRejectedValue({
      response: { status: 409 },
      body: { message: 'conflict' },
      message: 'conflict',
    });
    render({
      showEnabledSwitch: true,
      allowCardEditAction: true,
      labels: artifactListPageLabels,
      onEnabledChangeRefresh,
    });

    fireEvent.click(renderResult.getByTestId('viewFlyout-enabledSwitch'));

    await waitFor(() => {
      expect(refetchArtifact).toHaveBeenCalled();
      expect(onEnabledChangeRefresh).toHaveBeenCalled();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the open artifact on screen when a later refresh fails', () => {
    useGetArtifactMock.mockReturnValue({
      data: item,
      error: { message: 'nope', body: { message: 'missing' } },
      refetch: refetchArtifact,
    });

    render();

    expect(onClose).not.toHaveBeenCalled();
    expect(mockedContext.coreStart.notifications.toasts.addWarning).not.toHaveBeenCalled();
    expect(renderResult.getByTestId('viewFlyout-title')).toHaveTextContent('Signature one');
  });

  it('shows applied to 0 policies when the artifact is not assigned', () => {
    item.tags = [];
    useGetArtifactMock.mockReturnValue({ data: item, error: null, refetch: refetchArtifact });

    render();

    expect(renderResult.getByTestId('viewFlyout-policyAssignment-none')).toHaveTextContent(
      'Applied to 0 policies.'
    );
    expect(renderResult.queryByTestId('viewFlyout-policyAssignment-list')).not.toBeInTheDocument();
  });

  it('lists assigned policies as links when the user can read policies', () => {
    const policies: MenuItemPropsByPolicyId = {
      'policy-1': {
        children: 'Policy one',
        href: 'http://example/policy-1',
        target: '_blank',
      },
      'policy-2': {
        children: 'Policy two',
        href: 'http://example/policy-2',
        target: '_blank',
      },
    };
    item.tags = [buildPerPolicyTag('policy-1'), buildPerPolicyTag('policy-2')];
    useGetArtifactMock.mockReturnValue({ data: item, error: null, refetch: refetchArtifact });
    useArtifactAssignedPoliciesMock.mockReturnValue({ policies, isLoading: false });

    render();

    const firstPolicy = renderResult.getByTestId('viewFlyout-policyAssignment-policy-policy-1');
    const secondPolicy = renderResult.getByTestId('viewFlyout-policyAssignment-policy-policy-2');
    expect(firstPolicy).toHaveTextContent('Policy one');
    expect(firstPolicy).toHaveAttribute('href', 'http://example/policy-1');
    expect(secondPolicy).toHaveTextContent('Policy two');
    expect(secondPolicy).toHaveAttribute('href', 'http://example/policy-2');
  });

  it('lists assigned policies as text when the user cannot read policies', () => {
    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointAuthzInitialStateMock({ canReadPolicyManagement: false }),
    });
    item.tags = [buildPerPolicyTag('policy-1')];
    useGetArtifactMock.mockReturnValue({ data: item, error: null, refetch: refetchArtifact });
    useArtifactAssignedPoliciesMock.mockReturnValue({
      policies: {
        'policy-1': {
          children: 'Policy one',
          href: 'http://example/policy-1',
          target: '_blank',
        },
      },
      isLoading: false,
    });

    render();

    const policy = renderResult.getByTestId('viewFlyout-policyAssignment-policy-policy-1');
    expect(policy).toHaveTextContent('Policy one');
    expect(policy).not.toHaveAttribute('href');
  });

  it('shows the policy id when the policy is not in the policies map', () => {
    item.tags = [buildPerPolicyTag('policy-unknown')];
    useGetArtifactMock.mockReturnValue({ data: item, error: null, refetch: refetchArtifact });

    render();

    expect(
      renderResult.getByTestId('viewFlyout-policyAssignment-policy-policy-unknown')
    ).toHaveTextContent('policy-unknown');
  });

  it('opens edit and delete from the take action menu', () => {
    const onTakeAction = jest.fn();
    render({ labels: artifactListPageLabels, onTakeAction });

    fireEvent.click(renderResult.getByTestId('viewFlyout-takeActionButton'));

    expect(renderResult.getByTestId('viewFlyout-cardEditAction')).toHaveTextContent(
      'Edit artifact'
    );
    expect(renderResult.getByTestId('viewFlyout-cardDeleteAction')).toHaveTextContent(
      'Delete artifact'
    );

    fireEvent.click(renderResult.getByTestId('viewFlyout-cardEditAction'));
    expect(onTakeAction).toHaveBeenCalledWith({ type: 'edit', item });

    fireEvent.click(renderResult.getByTestId('viewFlyout-takeActionButton'));
    fireEvent.click(renderResult.getByTestId('viewFlyout-cardDeleteAction'));
    expect(onTakeAction).toHaveBeenCalledWith({ type: 'delete', item });
  });

  it('hides take action when edit and delete are not allowed', () => {
    render({ allowCardEditAction: false, allowCardDeleteAction: false });

    expect(renderResult.queryByTestId('viewFlyout-takeActionButton')).not.toBeInTheDocument();
  });

  it('disables take action when artifact actions are disabled', () => {
    useArtifactActionsDisabledMock.mockReturnValue({
      isDisabled: true,
      disabledTooltip: 'Not allowed',
    });

    render({ labels: artifactListPageLabels });

    expect(renderResult.getByTestId('viewFlyout-takeActionButton')).toBeDisabled();
  });

  it('shows an empty value when the artifact has no description', () => {
    item.description = '   ';
    useGetArtifactMock.mockReturnValue({ data: item, error: null });

    render();

    expect(renderResult.getByTestId('viewFlyout-description')).toHaveTextContent(getEmptyValue());
  });

  it('shows a loader while the artifact is being retrieved', () => {
    useGetArtifactMock.mockReturnValue({ data: undefined, error: null });

    render();

    expect(renderResult.getByTestId('viewFlyout-loader')).toBeInTheDocument();
    expect(renderResult.queryByTestId('viewFlyout-title')).not.toBeInTheDocument();
  });

  it('closes and warns when the artifact cannot be retrieved', () => {
    useGetArtifactMock.mockReturnValue({
      data: undefined,
      error: { message: 'nope', body: { message: 'missing' } },
    });

    render();

    expect(onClose).toHaveBeenCalled();
    expect(mockedContext.coreStart.notifications.toasts.addWarning).toHaveBeenCalledWith(
      'Failed to retrieve artifact. Reason: missing'
    );
  });
});
