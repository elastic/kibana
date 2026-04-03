/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { TimelineNonEcsData } from '../../../../common/search_strategy';
import { useAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { TakeActionButton } from './take_action_button';
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from './test_ids';

jest.mock('../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions');

const mockUseAddToCaseActions = useAddToCaseActions as jest.Mock;

const mockEcsData: Ecs = { _id: 'test-id', _index: 'test-index' };
const mockNonEcsData: TimelineNonEcsData[] = [{ field: 'host.name', value: ['test-host'] }];
const mockRefetchFlyoutData = jest.fn().mockResolvedValue(undefined);

const defaultProps = {
  ecsData: mockEcsData,
  nonEcsData: mockNonEcsData,
  refetchFlyoutData: mockRefetchFlyoutData,
};

const renderTakeActionButton = (props = defaultProps) => render(<TakeActionButton {...props} />);

describe('<TakeActionButton />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAddToCaseActions.mockReturnValue({ addToCaseActionItems: [] });
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

  it('should render action items in the popover', () => {
    const mockItems = [
      { name: 'Add to new case', onClick: jest.fn() },
      { name: 'Add to existing case', onClick: jest.fn() },
    ];
    mockUseAddToCaseActions.mockReturnValue({ addToCaseActionItems: mockItems });

    const { getByTestId } = renderTakeActionButton();
    fireEvent.click(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID));

    expect(getByTestId('takeActionPanelMenu')).toBeInTheDocument();
  });
});
