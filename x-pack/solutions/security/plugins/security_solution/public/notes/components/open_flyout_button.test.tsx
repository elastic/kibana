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
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../data_view_manager/hooks/__mocks__/use_data_view';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../flyout_v2/use_flyout_api.mock';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';

jest.mock('../../flyout_v2/use_flyout_api');

const mockEventId = 'eventId';
const mockTimelineId = 'timelineId';

describe('OpenFlyoutButtonIcon', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useDataView).mockReturnValue(withIndices(['test1', 'test2']));
  });

  it('should render the chevron icon', () => {
    const { getByTestId } = render(
      <TestProviders>
        <OpenFlyoutButtonIcon
          eventId={mockEventId}
          timelineId={mockTimelineId}
          iconType="chevronSingleRight"
        />
      </TestProviders>
    );

    expect(getByTestId(OPEN_FLYOUT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should open the new document flyout (from pattern)', () => {
    const { getByTestId } = render(
      <TestProviders>
        <OpenFlyoutButtonIcon
          eventId={mockEventId}
          timelineId={mockTimelineId}
          iconType="chevronSingleRight"
        />
      </TestProviders>
    );

    getByTestId(OPEN_FLYOUT_BUTTON_TEST_ID).click();

    expect(flyoutApi.openDocumentFlyoutFromPattern).toHaveBeenCalledWith({
      documentId: mockEventId,
      indexName: 'test1,test2',
      origin: FLYOUT_ORIGIN.NOTE_PREVIEW,
    });
  });
});
