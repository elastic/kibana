/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { EndpointMetadataGenerator } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { useUserPrivileges as _useUserPrivileges } from '../../../../common/components/user_privileges';
import { useToasts } from '../../../../common/lib/kibana';
import { useSendCancelRequest as _useSendCancelRequest } from '../../../hooks/response_actions/use_send_cancel_request';
import { useFetchEndpointList as _useFetchEndpointList } from '../../../hooks/endpoint/use_fetch_endpoint_list';
import { CancelActionModal } from './cancel_action_modal';
import { UX_MESSAGES } from '../translations';
import type { ActionDetails, MetadataListResponse } from '../../../../../common/endpoint/types';
import { EndpointSortableField } from '../../../../../common/endpoint/types';
import type { EndpointCapabilities } from '../../../../../common/endpoint/service/response_actions/constants';
import type { DeepPartial } from 'utility-types';

jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../hooks/response_actions/use_send_cancel_request');
jest.mock('../../../hooks/endpoint/use_fetch_endpoint_list');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;
const useToastsMock = useToasts as jest.Mock;
const useSendCancelRequestMock = _useSendCancelRequest as jest.Mock;
const useFetchEndpointListMock = _useFetchEndpointList as jest.Mock;

const makePendingAgentState = (): ActionDetails['agentState'][string] => ({
  isCompleted: false,
  wasSuccessful: false,
  errors: undefined,
  completedAt: undefined,
  wasCanceled: false,
});

const makeCompletedAgentState = (): ActionDetails['agentState'][string] => ({
  isCompleted: true,
  wasSuccessful: true,
  errors: undefined,
  completedAt: '2022-04-30T16:08:47.449Z',
  wasCanceled: false,
});

describe('CancelActionModal', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let generator: EndpointActionGenerator;
  let metadataGenerator: EndpointMetadataGenerator;
  let onClose: jest.Mock;
  let setUserPrivileges: ReturnType<AppContextTestRender['getUserPrivilegesMockSetter']>;
  let addSuccess: jest.Mock;
  let mutateAsync: jest.Mock;

  // Build a metadata list API response (as returned by `useFetchEndpointList`) where each host
  // reports the capabilities defined in `capabilitiesByAgentId`.
  const buildMetadataListResponse = (
    capabilitiesByAgentId: Record<string, EndpointCapabilities[]>
  ): MetadataListResponse => {
    const data = Object.entries(capabilitiesByAgentId).map(([agentId, capabilities]) => {
      const hostInfo = metadataGenerator.generateHostInfo();
      hostInfo.metadata.agent.id = agentId;
      hostInfo.metadata.Endpoint.capabilities = [...capabilities];
      return hostInfo;
    });

    return {
      data,
      total: data.length,
      page: 0,
      pageSize: data.length,
      sortField: EndpointSortableField.ENROLLED_AT,
      sortDirection: 'desc',
    };
  };

  const buildSingleAgentPendingAction = (
    overrides: DeepPartial<ActionDetails> = {}
  ): ActionDetails => {
    return generator.generateActionDetails({
      agents: ['agent-a'],
      isCompleted: false,
      agentState: { 'agent-a': makePendingAgentState() },
      ...overrides,
    });
  };

  const buildMultiAgentPendingAction = (): ActionDetails => {
    return generator.generateActionDetails({
      agents: ['agent-a', 'agent-b'],
      isCompleted: false,
      agentState: {
        'agent-a': makePendingAgentState(),
        'agent-b': makePendingAgentState(),
      },
    });
  };

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    generator = new EndpointActionGenerator('test');
    metadataGenerator = new EndpointMetadataGenerator('test');
    onClose = jest.fn();
    addSuccess = jest.fn();
    mutateAsync = jest.fn().mockResolvedValue({});
    useToastsMock.mockReturnValue({ addSuccess });
    setUserPrivileges = appTestContext.getUserPrivilegesMockSetter(useUserPrivilegesMock);
    setUserPrivileges.set({});
    useSendCancelRequestMock.mockReturnValue({
      error: null,
      isLoading: false,
      mutateAsync,
    });
    // By default, all requested hosts support `cancel`
    useFetchEndpointListMock.mockReturnValue({
      data: buildMetadataListResponse({ 'agent-a': ['cancel'], 'agent-b': ['cancel'] }),
      isError: false,
    });
  });

  afterEach(() => {
    setUserPrivileges.reset();
  });

  const renderModal = (action: ActionDetails = buildSingleAgentPendingAction()) => {
    renderResult = appTestContext.render(
      <CancelActionModal action={action} onClose={onClose} data-test-subj="test" />
    );
    return renderResult;
  };

  describe('modal structure', () => {
    it('should render the modal title', () => {
      renderModal();
      expect(renderResult.getByText(UX_MESSAGES.cancelActionModalTitle)).not.toBeNull();
    });

    it('should render the submit button', () => {
      renderModal();
      expect(renderResult.getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)).not.toBeNull();
    });

    it('should render the comment textarea', () => {
      renderModal();
      expect(renderResult.getByLabelText(UX_MESSAGES.cancelActionModalCommentLabel)).not.toBeNull();
    });

    it('should render the action command', () => {
      const action = buildSingleAgentPendingAction({ command: 'isolate' });
      renderModal(action);
      expect(renderResult.getByTestId('test-actionCommand').textContent).toEqual('isolate');
    });

    it('should call onClose when the modal is closed', async () => {
      renderModal();
      const closeButton = renderResult.getByLabelText('Closes this modal window');
      await userEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('single-agent action', () => {
    it('should display the hostname for a single-agent action', () => {
      renderModal();
      expect(renderResult.getByText('Host-agent-a')).not.toBeNull();
    });

    it('should not render the agent selector for a single-agent action', () => {
      renderModal();
      expect(
        renderResult.queryByLabelText(UX_MESSAGES.cancelActionModalAgentSelectorLabel)
      ).toBeNull();
    });

    it('should enable submit when a single-agent action is pending', () => {
      renderModal();
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('multi-agent action', () => {
    it('should render the agent selector when multiple agents are pending', () => {
      renderModal(buildMultiAgentPendingAction());
      expect(
        renderResult.getByLabelText(UX_MESSAGES.cancelActionModalAgentSelectorLabel)
      ).not.toBeNull();
    });

    it('should disable submit when no agents are selected', () => {
      renderModal(buildMultiAgentPendingAction());
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit after selecting at least one agent', async () => {
      renderModal(buildMultiAgentPendingAction());
      const firstAgentOption = renderResult.getByText('Host-agent-a');
      await userEvent.click(firstAgentOption);
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button');
      expect(submitButton).not.toBeDisabled();
    });

    it('should not show completed agents in the selector', () => {
      const action = generator.generateActionDetails({
        agents: ['agent-a', 'agent-b'],
        isCompleted: false,
        agentState: {
          'agent-a': makeCompletedAgentState(),
          'agent-b': makePendingAgentState(),
        },
      });
      renderModal(action);
      expect(renderResult.queryByText('Host-agent-a')).toBeNull();
      expect(renderResult.getByText('Host-agent-b')).not.toBeNull();
    });
  });

  describe('action already completed', () => {
    it('should show a warning callout when action is already complete', () => {
      const action = generator.generateActionDetails({ isCompleted: true });
      renderModal(action);
      expect(
        renderResult.getByText(UX_MESSAGES.cancelActionModalActionAlreadyComplete)
      ).not.toBeNull();
    });

    it('should disable submit when action is already complete', () => {
      const action = generator.generateActionDetails({ isCompleted: true });
      renderModal(action);
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button');
      expect(submitButton).toBeDisabled();
    });

    it('should not render the action form when action is already complete', () => {
      const action = generator.generateActionDetails({ isCompleted: true });
      renderModal(action);
      expect(renderResult.queryByTestId('test-actionCommand')).toBeNull();
    });
  });

  describe('permission checks', () => {
    it('should show a warning callout when user lacks permission to cancel the command', () => {
      setUserPrivileges.set({ canIsolateHost: false });
      const action = buildSingleAgentPendingAction({ command: 'isolate' });
      renderModal(action);
      expect(renderResult.getByText(UX_MESSAGES.cancelActionNotPermittedTooltip)).not.toBeNull();
    });

    it('should not show form content when user lacks permission', () => {
      setUserPrivileges.set({ canIsolateHost: false });
      const action = buildSingleAgentPendingAction({ command: 'isolate' });
      renderModal(action);
      expect(renderResult.queryByTestId('test-actionCommand')).toBeNull();
    });
  });

  describe('force flag (endpoint agent type)', () => {
    it('should show the force switch for endpoint agent type', () => {
      const action = buildSingleAgentPendingAction({ agentType: 'endpoint' });
      renderModal(action);
      expect(renderResult.getByRole('switch')).not.toBeNull();
    });

    it('should not show the force switch for non-endpoint agent types', () => {
      const action = buildSingleAgentPendingAction({ agentType: 'sentinel_one' });
      renderModal(action);
      expect(renderResult.queryByRole('switch')).toBeNull();
    });

    it('should default the force flag to false', () => {
      const action = buildSingleAgentPendingAction({ agentType: 'endpoint' });
      renderModal(action);
      const forceSwitch = renderResult.getByRole('switch');
      expect(forceSwitch).not.toBeChecked();
    });

    it('should toggle the force flag when switch is clicked', async () => {
      const action = buildSingleAgentPendingAction({ agentType: 'endpoint' });
      renderModal(action);
      const forceSwitch = renderResult.getByRole('switch');
      await userEvent.click(forceSwitch);
      expect(forceSwitch).toBeChecked();
    });
  });

  describe('submit action', () => {
    it('should call mutateAsync with the correct endpoint_ids and action id', async () => {
      const action = buildSingleAgentPendingAction({ id: 'action-123' });
      renderModal(action);
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button')!;
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            endpoint_ids: ['agent-a'],
            parameters: expect.objectContaining({ id: 'action-123' }),
          })
        );
      });
    });

    it('should show success toast and close modal on successful cancel', async () => {
      renderModal();
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button')!;
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(addSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should include comment in the cancel request body', async () => {
      renderModal();
      const textarea = renderResult.getByLabelText(UX_MESSAGES.cancelActionModalCommentLabel);
      await userEvent.type(textarea, 'cancel reason');
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button')!;
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ comment: 'cancel reason' })
        );
      });
    });

    it('should call mutateAsync with multiple endpoint_ids when multiple agents are selected', async () => {
      const action = buildMultiAgentPendingAction();
      renderModal(action);
      const firstAgentOption = renderResult.getByText('Host-agent-a');
      await userEvent.click(firstAgentOption);
      const secondAgentOption = renderResult.getByText('Host-agent-b');
      await userEvent.click(secondAgentOption);
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button')!;
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            endpoint_ids: expect.arrayContaining(['agent-a', 'agent-b']),
          })
        );
      });
    });

    it('should include force flag in the cancel request body when toggled', async () => {
      const action = buildSingleAgentPendingAction({ agentType: 'endpoint' });
      renderModal(action);
      const forceSwitch = renderResult.getByRole('switch');
      await userEvent.click(forceSwitch);
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button')!;
      await userEvent.click(submitButton);
      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            parameters: expect.objectContaining({ force: true }),
          })
        );
      });
    });
  });

  describe('error handling', () => {
    it('should show a danger callout when the cancel request returned an error', () => {
      useSendCancelRequestMock.mockReturnValue({
        error: new Error('API failure'),
        isLoading: false,
        mutateAsync: jest.fn(),
      });
      renderModal();
      expect(
        renderResult.getByTestId('test-cancelActionModal').querySelector('.euiCallOut--danger')
      ).not.toBeNull();
    });

    it('should not show success toast or close modal when error occurs', () => {
      useSendCancelRequestMock.mockReturnValue({
        error: new Error('API failure'),
        isLoading: false,
        mutateAsync: jest.fn(),
      });
      renderModal();
      expect(addSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('cancel capability validation', () => {
    const setCapabilitiesLoading = () => {
      useFetchEndpointListMock.mockReturnValue({ data: undefined, isError: false });
    };

    const setCapabilities = (capabilitiesByAgentId: Record<string, EndpointCapabilities[]>) => {
      useFetchEndpointListMock.mockReturnValue({
        data: buildMetadataListResponse(capabilitiesByAgentId),
        isError: false,
      });
    };

    it('should query the endpoints list for the pending agent ids', () => {
      renderModal(buildMultiAgentPendingAction());
      expect(useFetchEndpointListMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 2,
          kuery: 'united.endpoint.agent.id:"agent-a" or united.endpoint.agent.id:"agent-b"',
        }),
        expect.objectContaining({ enabled: true })
      );
    });

    it('should show a loader while capabilities data is being retrieved', () => {
      setCapabilitiesLoading();
      renderModal();
      expect(renderResult.getByTestId('test-capabilitiesLoader')).not.toBeNull();
      expect(renderResult.queryByTestId('test-actionCommand')).toBeNull();
    });

    it('should disable submit while capabilities data is being retrieved', () => {
      setCapabilitiesLoading();
      renderModal();
      const submitButton = renderResult
        .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
        .closest('button');
      expect(submitButton).toBeDisabled();
    });

    it('should not enable the query when the user lacks access to the metadata API', () => {
      setUserPrivileges.set({ canReadSecuritySolution: false });
      renderModal();
      expect(useFetchEndpointListMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ enabled: false })
      );
      // Form is shown (relies on the API to catch unsupported hosts)
      expect(renderResult.getByTestId('test-actionCommand')).not.toBeNull();
    });

    it('should not enable the query for non-endpoint agent types', () => {
      const action = buildSingleAgentPendingAction({ agentType: 'sentinel_one' });
      renderModal(action);
      expect(useFetchEndpointListMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ enabled: false })
      );
      expect(renderResult.getByTestId('test-actionCommand')).not.toBeNull();
    });

    it('should show the form when the capabilities check fails (rely on the API)', () => {
      useFetchEndpointListMock.mockReturnValue({ data: undefined, isError: true });
      renderModal();
      expect(renderResult.getByTestId('test-actionCommand')).not.toBeNull();
      expect(renderResult.queryByTestId('test-capabilitiesLoader')).toBeNull();
    });

    describe('single-agent action', () => {
      it('should show the all-hosts-unsupported callout when the host does not support cancel', () => {
        setCapabilities({ 'agent-a': ['isolation'] });
        renderModal();
        expect(renderResult.getByTestId('test-allHostsUnsupportedCallout')).not.toBeNull();
        expect(renderResult.queryByTestId('test-actionCommand')).toBeNull();
      });

      it('should disable submit when the host does not support cancel', () => {
        setCapabilities({ 'agent-a': ['isolation'] });
        renderModal();
        const submitButton = renderResult
          .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
          .closest('button');
        expect(submitButton).toBeDisabled();
      });

      it('should show the form and enable submit when the host supports cancel', () => {
        renderModal();
        expect(renderResult.getByTestId('test-actionCommand')).not.toBeNull();
        const submitButton = renderResult
          .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
          .closest('button');
        expect(submitButton).not.toBeDisabled();
      });
    });

    describe('multi-agent action', () => {
      it('should disable the selector option for a host that does not support cancel', () => {
        setCapabilities({ 'agent-a': ['cancel'], 'agent-b': ['isolation'] });
        renderModal(buildMultiAgentPendingAction());

        const supportedOption = renderResult.getByText('Host-agent-a').closest('li');
        const unsupportedOption = renderResult.getByText('Host-agent-b').closest('li');

        expect(supportedOption?.getAttribute('aria-disabled')).not.toEqual('true');
        expect(unsupportedOption?.getAttribute('aria-disabled')).toEqual('true');
      });

      it('should not include an unsupported host in the cancel request', async () => {
        setCapabilities({ 'agent-a': ['cancel'], 'agent-b': ['isolation'] });
        renderModal(buildMultiAgentPendingAction());

        await userEvent.click(renderResult.getByText('Host-agent-a'));
        // Clicking the disabled option should have no effect
        await userEvent.click(renderResult.getByText('Host-agent-b'));

        const submitButton = renderResult
          .getByText(UX_MESSAGES.cancelActionModalSubmitButonLabel)
          .closest('button')!;
        await userEvent.click(submitButton);

        await waitFor(() => {
          expect(mutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint_ids: ['agent-a'] })
          );
        });
      });

      it('should show the all-hosts-unsupported callout when no host supports cancel', () => {
        setCapabilities({ 'agent-a': ['isolation'], 'agent-b': ['isolation'] });
        renderModal(buildMultiAgentPendingAction());
        expect(renderResult.getByTestId('test-allHostsUnsupportedCallout')).not.toBeNull();
        expect(
          renderResult.queryByLabelText(UX_MESSAGES.cancelActionModalAgentSelectorLabel)
        ).toBeNull();
      });
    });
  });
});
