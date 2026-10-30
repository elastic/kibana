/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { usePrivilegedUserActivityParams } from './hooks';
import { VisualizationToggleOptions } from './types';
import type { TableItemType } from './types';
import { TestProviders } from '../../../../../common/mock';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';
import { cellActionRenderer } from '../../../../../flyout_v2/shared/components/cell_actions';
import { EVENT_TITLE } from '../../../../../flyout_v2/shared/constants/flyout_titles';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';

jest.mock('../../../../../flyout_v2/use_flyout_api');

jest.mock('../../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

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
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  describe.each([
    VisualizationToggleOptions.GRANTED_RIGHTS,
    VisualizationToggleOptions.ACCOUNT_SWITCHES,
    VisualizationToggleOptions.AUTHENTICATIONS,
  ])('%s actions column', (toggleOption) => {
    it('opens the document flyout', () => {
      clickActionsCell(toggleOption);

      expect(flyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith({
        documentId: 'test-id',
        indexName: 'test-index',
        renderCellActions: cellActionRenderer,
        origin: FLYOUT_ORIGIN.PRIVILEGED_USER_ACTIVITY_TABLE,
        title: EVENT_TITLE,
      });
    });
  });
});
