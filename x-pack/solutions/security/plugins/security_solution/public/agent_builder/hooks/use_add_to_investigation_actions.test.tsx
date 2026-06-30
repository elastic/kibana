/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useAddToInvestigationActions } from './use_add_to_investigation_actions';
import { TestProviders } from '../../common/mock';
import { useKibana } from '../../common/lib/kibana';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';
import { createInvestigationFromAlert } from '../services/create_investigation_from_alert';
import { useReportAddToChat } from './use_report_add_to_chat';
import { useSelectInvestigationModal } from './use_select_investigation_modal';

jest.mock('../../common/lib/kibana');
jest.mock('./use_agent_builder_availability');
jest.mock('../services/create_investigation_from_alert');
jest.mock('./use_report_add_to_chat');
jest.mock('./use_select_investigation_modal');

const useKibanaMock = useKibana as jest.Mock;
const useAgentBuilderAvailabilityMock = useAgentBuilderAvailability as jest.Mock;
const createInvestigationFromAlertMock = createInvestigationFromAlert as jest.Mock;
const useReportAddToChatMock = useReportAddToChat as jest.Mock;
const useSelectInvestigationModalMock = useSelectInvestigationModal as jest.Mock;

const defaultProps = {
  onMenuItemClick: jest.fn(),
  ecsData: { _id: 'alert-1', event: { kind: ['signal'] } },
  nonEcsData: [{ field: 'kibana.alert.rule.name', value: ['Test rule'] }],
};

describe('useAddToInvestigationActions', () => {
  const navigateToApp = jest.fn();
  const addError = jest.fn();
  const reportAddToChat = jest.fn();
  const openSelectInvestigationModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        application: { navigateToApp },
        http: {},
        notifications: { toasts: { addError } },
      },
    });
    useAgentBuilderAvailabilityMock.mockReturnValue({ isAgentBuilderEnabled: true });
    useReportAddToChatMock.mockReturnValue(reportAddToChat);
    createInvestigationFromAlertMock.mockResolvedValue('conversation-123');
    useSelectInvestigationModalMock.mockReturnValue({
      open: openSelectInvestigationModal,
      selectInvestigationModal: null,
    });
  });

  it('returns no menu items when agent builder is disabled', () => {
    useAgentBuilderAvailabilityMock.mockReturnValue({ isAgentBuilderEnabled: false });

    const { result } = renderHook(() => useAddToInvestigationActions(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.addToInvestigationActionItems).toEqual([]);
  });

  it('returns existing and start investigation menu items when enabled', () => {
    const { result } = renderHook(() => useAddToInvestigationActions(defaultProps), {
      wrapper: TestProviders,
    });

    expect(result.current.addToInvestigationActionItems).toHaveLength(2);
    expect(result.current.addToInvestigationActionItems[0]['data-test-subj']).toBe(
      'add-to-existing-investigation-action'
    );
    expect(result.current.addToInvestigationActionItems[1]['data-test-subj']).toBe(
      'start-investigation-action'
    );
  });

  it('creates an investigation and navigates to Agent Builder on click', async () => {
    const { result } = renderHook(() => useAddToInvestigationActions(defaultProps), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.handleStartInvestigationClick();
    });

    expect(defaultProps.onMenuItemClick).toHaveBeenCalled();
    expect(createInvestigationFromAlertMock).toHaveBeenCalled();
    expect(reportAddToChat).toHaveBeenCalledWith({
      pathway: 'alerts_flyout',
      attachments: ['alert'],
    });
    expect(navigateToApp).toHaveBeenCalledWith('agent_builder', {
      path: '/conversations/conversation-123',
    });
  });

  it('opens the select investigation modal for add to existing', () => {
    const { result } = renderHook(() => useAddToInvestigationActions(defaultProps), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.handleAddToExistingInvestigationClick();
    });

    expect(defaultProps.onMenuItemClick).toHaveBeenCalled();
    expect(openSelectInvestigationModal).toHaveBeenCalledWith({
      ecsData: defaultProps.ecsData,
      nonEcsData: defaultProps.nonEcsData,
    });
  });

  it('shows a toast when investigation creation fails', async () => {
    createInvestigationFromAlertMock.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAddToInvestigationActions(defaultProps), {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.handleStartInvestigationClick();
    });

    expect(addError).toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();
  });
});
