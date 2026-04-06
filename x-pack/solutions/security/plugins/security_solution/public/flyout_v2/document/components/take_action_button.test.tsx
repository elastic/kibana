/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { TimelineNonEcsData } from '../../../../common/search_strategy';
import { useAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { useAlertsActions } from '../../../detections/components/alerts_table/timeline_actions/use_alerts_actions';
import { useAlertAssigneesActions } from '../../../detections/components/alerts_table/timeline_actions/use_alert_assignees_actions';
import { useAlertTagsActions } from '../../../detections/components/alerts_table/timeline_actions/use_alert_tags_actions';
import { useInvestigateInTimeline } from '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { TakeActionButton } from './take_action_button';
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from './test_ids';

jest.mock('../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions');
jest.mock('../../../detections/components/alerts_table/timeline_actions/use_alerts_actions');
jest.mock(
  '../../../detections/components/alerts_table/timeline_actions/use_alert_assignees_actions'
);
jest.mock('../../../detections/components/alerts_table/timeline_actions/use_alert_tags_actions');
jest.mock(
  '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);
jest.mock('../../../common/hooks/is_in_security_app');

const mockUseAddToCaseActions = useAddToCaseActions as jest.Mock;
const mockUseAlertsActions = useAlertsActions as jest.Mock;
const mockUseAlertAssigneesActions = useAlertAssigneesActions as jest.Mock;
const mockUseAlertTagsActions = useAlertTagsActions as jest.Mock;
const createMockHit = (flattened: Record<string, unknown> = {}): DataTableRecord =>
  ({
    id: 'test-id',
    raw: { _id: 'test-id', _index: 'test-index' },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const mockUseInvestigateInTimeline = useInvestigateInTimeline as jest.Mock;
const mockUseIsInSecurityApp = useIsInSecurityApp as jest.Mock;
const mockEcsData: Ecs = { _id: 'test-id', _index: 'test-index' };
const mockNonEcsData: TimelineNonEcsData[] = [{ field: 'host.name', value: ['test-host'] }];
const mockRefetchFlyoutData = jest.fn().mockResolvedValue(undefined);
const mockOnAlertUpdated = jest.fn();
const mockOnShowNotes = jest.fn();

const defaultProps = {
  hit: createMockHit(),
  ecsData: mockEcsData,
  nonEcsData: mockNonEcsData,
  refetchFlyoutData: mockRefetchFlyoutData,
  onAlertUpdated: mockOnAlertUpdated,
  onShowNotes: mockOnShowNotes,
};

const renderTakeActionButton = (props = defaultProps) => render(<TakeActionButton {...props} />);

describe('<TakeActionButton />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAddToCaseActions.mockReturnValue({ addToCaseActionItems: [] });
    mockUseAlertsActions.mockReturnValue({ actionItems: [], panels: [] });
    mockUseAlertAssigneesActions.mockReturnValue({
      alertAssigneesItems: [],
      alertAssigneesPanels: [],
    });
    mockUseAlertTagsActions.mockReturnValue({ alertTagsItems: [], alertTagsPanels: [] });
    mockUseInvestigateInTimeline.mockReturnValue({ investigateInTimelineActionItems: [] });
    mockUseIsInSecurityApp.mockReturnValue(true);
  });

  it('should render the take action button', () => {
    const { getByTestId } = renderTakeActionButton();

    expect(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID)).toHaveTextContent('Take action');
  });

  it('should not be disabled', () => {
    const { getByTestId } = renderTakeActionButton();

    expect(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID)).not.toBeDisabled();
  });

  it('should open the popover when the button is clicked', () => {
    const { getByTestId } = renderTakeActionButton();

    fireEvent.click(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID));

    expect(document.querySelector('[data-test-subj="takeActionPanelMenu"]')).toBeInTheDocument();
  });

  it('should call useAddToCaseActions with the correct arguments', () => {
    renderTakeActionButton();

    expect(mockUseAddToCaseActions).toHaveBeenCalledWith(
      expect.objectContaining({
        ecsData: mockEcsData,
        nonEcsData: mockNonEcsData,
        onSuccess: mockRefetchFlyoutData,
      })
    );
  });

  it('should call useInvestigateInTimeline with the correct arguments', () => {
    renderTakeActionButton();

    expect(mockUseInvestigateInTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ ecsRowData: mockEcsData })
    );
  });

  it('should include investigateInTimelineActionItems when in Security app', () => {
    mockUseIsInSecurityApp.mockReturnValue(true);
    const timelineItem = { name: 'Investigate in timeline', onClick: jest.fn() };
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimelineActionItems: [timelineItem],
    });

    renderTakeActionButton();

    expect(mockUseInvestigateInTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ ecsRowData: mockEcsData })
    );
  });

  it('should not include investigateInTimelineActionItems when not in Security app (e.g. Discover)', () => {
    mockUseIsInSecurityApp.mockReturnValue(false);
    const timelineItem = { name: 'Investigate in timeline', onClick: jest.fn() };
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimelineActionItems: [timelineItem],
    });

    const { queryByText } = renderTakeActionButton();

    fireEvent.click(queryByText('Take action')!.closest('button')!);

    expect(queryByText('Investigate in timeline')).not.toBeInTheDocument();
  });

  it('should pass onAlertUpdated as refetch to useAlertsActions', () => {
    renderTakeActionButton();

    expect(mockUseAlertsActions).toHaveBeenCalledWith(
      expect.objectContaining({ refetch: mockOnAlertUpdated })
    );
  });

  it('should include status action items when alertStatus is present in hit', () => {
    const statusItem = { name: 'Mark as acknowledged', onClick: jest.fn() };
    mockUseAlertsActions.mockReturnValue({ actionItems: [statusItem], panels: [] });

    const alertHit = createMockHit({ 'kibana.alert.workflow_status': 'open' });
    renderTakeActionButton({ ...defaultProps, hit: alertHit });

    expect(mockUseAlertsActions).toHaveBeenCalledWith(
      expect.objectContaining({
        alertStatus: 'open',
        eventId: 'test-id',
        scopeId: '',
      })
    );
  });

  it('should not include status action items when alertStatus is not present in hit', () => {
    const statusItem = { name: 'Mark as acknowledged', onClick: jest.fn() };
    mockUseAlertsActions.mockReturnValue({ actionItems: [statusItem], panels: [] });

    renderTakeActionButton({ ...defaultProps, hit: createMockHit() });

    expect(mockUseAlertsActions).toHaveBeenCalledWith(
      expect.objectContaining({
        alertStatus: undefined,
      })
    );
  });

  it('should call useAlertAssigneesActions with ecsData and closePopover', () => {
    renderTakeActionButton();

    expect(mockUseAlertAssigneesActions).toHaveBeenCalledWith(
      expect.objectContaining({ ecsRowData: mockEcsData })
    );
  });

  it('should call onAlertUpdated and refetchFlyoutData when assignees are updated', () => {
    renderTakeActionButton();

    const assigneesCallArgs = mockUseAlertAssigneesActions.mock.calls[0][0];
    assigneesCallArgs.refetch();

    expect(mockOnAlertUpdated).toHaveBeenCalled();
    expect(mockRefetchFlyoutData).toHaveBeenCalled();
  });

  it('should call useAlertTagsActions with ecsData and onAlertUpdated as refetch', () => {
    renderTakeActionButton();

    expect(mockUseAlertTagsActions).toHaveBeenCalledWith(
      expect.objectContaining({
        ecsRowData: mockEcsData,
        refetch: mockOnAlertUpdated,
      })
    );
  });

  describe('alert vs non-alert document', () => {
    const statusItem = { name: 'Mark as acknowledged', onClick: jest.fn() };
    const assigneeItem = { name: 'Assign alert', onClick: jest.fn() };
    const tagsItem = { name: 'Apply alert tags', onClick: jest.fn() };

    beforeEach(() => {
      mockUseAlertsActions.mockReturnValue({ actionItems: [statusItem], panels: [] });
      mockUseAlertAssigneesActions.mockReturnValue({
        alertAssigneesItems: [assigneeItem],
        alertAssigneesPanels: [],
      });
      mockUseAlertTagsActions.mockReturnValue({ alertTagsItems: [tagsItem], alertTagsPanels: [] });
    });

    it('should include status, assignees and tags items for alert documents (event.kind === signal)', () => {
      const alertHit = createMockHit({ 'event.kind': 'signal' });
      const { getByTestId, getByText, queryByText } = renderTakeActionButton({
        ...defaultProps,
        hit: alertHit,
      });

      fireEvent.click(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID));

      expect(getByText('Mark as acknowledged')).toBeInTheDocument();
      expect(getByText('Assign alert')).toBeInTheDocument();
      expect(getByText('Apply alert tags')).toBeInTheDocument();
      expect(queryByText('Add note')).not.toBeInTheDocument();
    });

    it('should exclude status, assignees and tags items but have note item for non-alert documents', () => {
      const eventHit = createMockHit({ 'event.kind': 'event' });
      const { getByTestId, getByText, queryByText } = renderTakeActionButton({
        ...defaultProps,
        hit: eventHit,
      });

      fireEvent.click(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID));

      expect(queryByText('Mark as acknowledged')).not.toBeInTheDocument();
      expect(queryByText('Assign alert')).not.toBeInTheDocument();
      expect(queryByText('Apply alert tags')).not.toBeInTheDocument();
      expect(getByText('Add note')).toBeInTheDocument();
    });

    it('should exclude status, assignees and tags items but have note item when event.kind is not set', () => {
      const { getByTestId, getByText, queryByText } = renderTakeActionButton({
        ...defaultProps,
        hit: createMockHit(),
      });

      fireEvent.click(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID));

      expect(queryByText('Mark as acknowledged')).not.toBeInTheDocument();
      expect(queryByText('Assign alert')).not.toBeInTheDocument();
      expect(queryByText('Apply alert tags')).not.toBeInTheDocument();
      expect(getByText('Add note')).toBeInTheDocument();
    });
  });

  it('should call onShowNotes when "Add note" is clicked', () => {
    const { getByTestId, getByText } = renderTakeActionButton({
      ...defaultProps,
      hit: createMockHit(),
    });

    fireEvent.click(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID));
    fireEvent.click(getByText('Add note'));

    expect(mockOnShowNotes).toHaveBeenCalledTimes(1);
  });
});
