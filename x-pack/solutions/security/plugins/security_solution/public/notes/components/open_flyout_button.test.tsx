/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../common/mock';
import { OPEN_FLYOUT_BUTTON_TEST_ID } from './test_ids';
import { OpenFlyoutButtonIcon } from './open_flyout_button';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsRightPanelKey } from '../../flyout/document_details/shared/constants/panel_keys';
import { TableId } from '@kbn/securitysolution-data-table';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('@kbn/expandable-flyout');

const mockEventId = 'eventId';
const mockTimelineId = 'timelineId';

describe('OpenFlyoutButtonIcon', () => {
  it('should render the chevron icon', () => {
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openFlyout: jest.fn() });

    const { getByTestId } = render(
      <TestProviders>
        <OpenFlyoutButtonIcon
          eventId={mockEventId}
          timelineId={mockTimelineId}
          iconType="arrowRight"
        />
      </TestProviders>
    );

    expect(getByTestId(OPEN_FLYOUT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should call the expandable flyout api when the button is clicked', () => {
    const openFlyout = jest.fn();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openFlyout });
    jest.mocked(useDataView).mockReturnValue(withIndices(['test1', 'test2']));

    const { getByTestId } = render(
      <TestProviders>
        <OpenFlyoutButtonIcon
          eventId={mockEventId}
          timelineId={mockTimelineId}
          iconType="arrowRight"
        />
      </TestProviders>
    );

    const button = getByTestId(OPEN_FLYOUT_BUTTON_TEST_ID);
    button.click();

    expect(openFlyout).toHaveBeenCalledWith({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: mockEventId,
          indexName: 'test1,test2',
          scopeId: TableId.alertsOnAlertsPage,
        },
      },
    });
  });
});
