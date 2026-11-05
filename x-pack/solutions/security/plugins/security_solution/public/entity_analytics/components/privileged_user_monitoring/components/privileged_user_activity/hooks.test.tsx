/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { usePrivilegedUserActivityParams } from './hooks';
import { VisualizationToggleOptions } from './types';
import type { TableItemType } from './types';
import { TestProviders } from '../../../../../common/mock';
import { createExpandableFlyoutApiMock } from '../../../../../common/mock/expandable_flyout';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';
import { cellActionRenderer } from '../../../../../flyout_v2/shared/components/cell_actions';
import { EVENT_TITLE } from '../../../../../flyout_v2/shared/constants/flyout_titles';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import { DocumentDetailsRightPanelKey } from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { SCOPE_ID } from '../../constants';

jest.mock('../../../../../common/hooks/use_is_new_flyout_enabled');
jest.mock('../../../../../flyout_v2/use_flyout_api');
jest.mock('@kbn/expandable-flyout');

jest.mock('../../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

const mockOpenRightPanel = jest.fn();

const record = { _id: 'test-id', _index: 'test-index' } as TableItemType;

const clickActionsCell = (toggleOption: VisualizationToggleOptions) => {
  const { result } = renderHook(() => usePrivilegedUserActivityParams(toggleOption, 'logs-*', {}), {
    wrapper: TestProviders,
  });
  const actionsColumn = result.current.columns[0] as EuiTableFieldDataColumnType<TableItemType>;
  render(<>{actionsColumn.render?.(record, record)}</>, { wrapper: TestProviders });
  fireEvent.click(screen.getByRole('button'));
};

describe('usePrivilegedUserActivityParams', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openRightPanel: mockOpenRightPanel,
    });
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  describe.each([
    VisualizationToggleOptions.GRANTED_RIGHTS,
    VisualizationToggleOptions.ACCOUNT_SWITCHES,
    VisualizationToggleOptions.AUTHENTICATIONS,
  ])('%s actions column', (toggleOption) => {
    it('opens the new document flyout when the new flyout is enabled', () => {
      jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

      clickActionsCell(toggleOption);

      expect(flyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
        documentId: 'test-id',
        indexName: 'test-index',
        renderCellActions: cellActionRenderer,
        origin: FLYOUT_ORIGIN.PRIVILEGED_USER_ACTIVITY_TABLE,
        title: EVENT_TITLE,
      });
      expect(mockOpenRightPanel).not.toHaveBeenCalled();
    });

    it('opens the legacy document details right panel when the new flyout is disabled', () => {
      jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);

      clickActionsCell(toggleOption);

      expect(mockOpenRightPanel).toHaveBeenCalledWith({
        id: DocumentDetailsRightPanelKey,
        params: { id: 'test-id', indexName: 'test-index', scopeId: SCOPE_ID },
      });
      expect(flyoutApi.openDocumentFlyoutFromIndex).not.toHaveBeenCalled();
    });
  });
});
