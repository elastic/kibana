/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { TableTabSettingButton } from './table_tab_setting_button';
import {
  TABLE_TAB_SETTING_BUTTON_TEST_ID,
  TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID,
  TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID,
  TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID,
} from './test_ids';
import userEvent from '@testing-library/user-event';

const mockTableTabState = {
  pinnedFields: [],
  showHighlightedFields: false,
  hideEmptyFields: false,
  hideAlertFields: false,
};
const mockSetTableTabState = jest.fn();
const mockSetIsPopoverOpen = jest.fn();

const renderComponent = () => {
  return render(
    <TableTabSettingButton
      tableTabState={mockTableTabState}
      setTableTabState={mockSetTableTabState}
      isPopoverOpen={false}
      setIsPopoverOpen={mockSetIsPopoverOpen}
      isAlert={true}
    />,
    // TODO: fails with concurrent mode
    { legacyRoot: true }
  );
};

describe('<TableTabSettingButton />', () => {
  it('should render button', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId(TABLE_TAB_SETTING_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render highlighted fields only setting correctly', async () => {
    const { getByTestId } = renderComponent();
    const button = getByTestId(TABLE_TAB_SETTING_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    act(async () => {
      await userEvent.click(button);
      const option = getByTestId(TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID);
      expect(option).toBeInTheDocument();
      expect(option).not.toBeChecked();

      await userEvent.click(option);
      expect(option).toBeChecked();
      expect(mockSetTableTabState).toHaveBeenCalledWith({
        ...mockTableTabState,
        showHighlightedFields: true,
      });
    });
  });

  it('should render hide empty fields setting correctly', async () => {
    const { getByTestId } = renderComponent();
    const button = getByTestId(TABLE_TAB_SETTING_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    act(async () => {
      await userEvent.click(button);
      const option = getByTestId(TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID);
      expect(option).toBeInTheDocument();
      expect(option).not.toBeChecked();

      await userEvent.click(option);
      expect(option).toBeChecked();
      expect(mockSetTableTabState).toHaveBeenCalledWith({
        ...mockTableTabState,
        hideEmptyFields: true,
      });
    });
  });

  it('should render hide alert fields setting correctly', async () => {
    const { getByTestId } = renderComponent();
    const button = getByTestId(TABLE_TAB_SETTING_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    act(async () => {
      await userEvent.click(button);
      const option = getByTestId(TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID);
      expect(option).toBeInTheDocument();
      expect(option).not.toBeChecked();

      await userEvent.click(option);
      expect(option).toBeChecked();
      expect(mockSetTableTabState).toHaveBeenCalledWith({
        ...mockTableTabState,
        hideAlertFields: true,
      });
    });
  });

  it('should not render hide alert fields setting if the document is not an alert', () => {
    const { getByTestId, queryByTestId } = render(
      <TableTabSettingButton
        tableTabState={mockTableTabState}
        setTableTabState={mockSetTableTabState}
        isPopoverOpen={false}
        setIsPopoverOpen={mockSetIsPopoverOpen}
        isAlert={false}
      />,
      // TODO: fails with concurrent mode
      { legacyRoot: true }
    );
    const button = getByTestId(TABLE_TAB_SETTING_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    act(async () => {
      await userEvent.click(button);
      expect(getByTestId(TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID)).not.toBeInTheDocument();
    });
  });
});
