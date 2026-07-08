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
import { useDocumentFlyoutApi } from '../../flyout_v2/document/use_document_flyout_api';
import { createDocumentFlyoutApiMock } from '../../flyout_v2/document/use_document_flyout_api.mock';
import { useIsNewFlyoutEnabled } from '../../common/hooks/use_is_new_flyout_enabled';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../flyout_v2/document/use_document_flyout_api');
jest.mock('../../common/hooks/use_is_new_flyout_enabled');

const mockEventId = 'eventId';
const mockTimelineId = 'timelineId';

describe('OpenFlyoutButtonIcon', () => {
  let documentFlyoutApi: ReturnType<typeof createDocumentFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    documentFlyoutApi = createDocumentFlyoutApiMock();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openFlyout: jest.fn() });
    jest.mocked(useDocumentFlyoutApi).mockReturnValue(documentFlyoutApi);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
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

  it('should open the legacy expandable flyout when the new flyout is disabled', () => {
    const openFlyout = jest.fn();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openFlyout });

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
    expect(documentFlyoutApi.openDocumentFlyoutFromPattern).not.toHaveBeenCalled();
  });

  it('should open the new document flyout (from pattern) when the new flyout is enabled', () => {
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

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

    expect(documentFlyoutApi.openDocumentFlyoutFromPattern).toHaveBeenCalledWith({
      documentId: mockEventId,
      indexName: 'test1,test2',
    });
  });
});
