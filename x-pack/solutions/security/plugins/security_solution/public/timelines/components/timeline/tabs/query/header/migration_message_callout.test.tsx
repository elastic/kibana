/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  ADD_ALERTS_FILTER_BUTTON_TEST_ID,
  ALERTS_ONLY_DATA_VIEW_BUTTON_TEST_ID,
  CALLOUT_TEST_ID,
  MigrationMessageCallout,
} from './migration_message_callout';
import { useTimelineSelectAlertsOnlyDataView } from '../hooks/use_timeline_select_alerts_only_data_view';
import { useAddAlertsOnlyFilter } from '../hooks/use_add_alerts_only_filter';
import {
  CALL_OUT_ALERTS_ONLY_MIGRATION_CONTENT,
  CALL_OUT_ALERTS_ONLY_MIGRATION_SWITCH_BUTTON,
  CALL_OUT_FILTER_FOR_ALERTS_BUTTON,
} from './translations';

jest.mock('../hooks/use_timeline_select_alerts_only_data_view');
jest.mock('../hooks/use_add_alerts_only_filter');

describe('MigrationMessageCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    (useTimelineSelectAlertsOnlyDataView as jest.Mock).mockReturnValue(jest.fn());
    (useAddAlertsOnlyFilter as jest.Mock).mockReturnValue(jest.fn());

    const { getByTestId } = render(<MigrationMessageCallout timelineId={'test'} />);

    expect(getByTestId(CALLOUT_TEST_ID)).toHaveTextContent(CALL_OUT_ALERTS_ONLY_MIGRATION_CONTENT);
    expect(getByTestId(ALERTS_ONLY_DATA_VIEW_BUTTON_TEST_ID)).toHaveTextContent(
      CALL_OUT_ALERTS_ONLY_MIGRATION_SWITCH_BUTTON
    );
    expect(getByTestId(ADD_ALERTS_FILTER_BUTTON_TEST_ID)).toHaveTextContent(
      CALL_OUT_FILTER_FOR_ALERTS_BUTTON
    );
  });

  it('should call the selectAlertsDataView callback', () => {
    const selectAlertsDataView = jest.fn();
    (useTimelineSelectAlertsOnlyDataView as jest.Mock).mockReturnValue(selectAlertsDataView);
    (useAddAlertsOnlyFilter as jest.Mock).mockReturnValue(jest.fn());

    const { getByTestId } = render(<MigrationMessageCallout timelineId={'test'} />);

    getByTestId(ALERTS_ONLY_DATA_VIEW_BUTTON_TEST_ID).click();
    expect(selectAlertsDataView).toHaveBeenCalled();
  });

  it('should call the addAlertsFilter callback', () => {
    const addAlertsFilter = jest.fn();
    (useAddAlertsOnlyFilter as jest.Mock).mockReturnValue(addAlertsFilter);
    (useTimelineSelectAlertsOnlyDataView as jest.Mock).mockReturnValue(jest.fn());

    const { getByTestId } = render(<MigrationMessageCallout timelineId={'test'} />);

    getByTestId(ADD_ALERTS_FILTER_BUTTON_TEST_ID).click();
    expect(addAlertsFilter).toHaveBeenCalled();
  });
});
