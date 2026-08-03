/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { UserCellRenderer } from './user_cell_renderer';
import type { StartServices } from '../../types';
import type { SecurityAppStore } from '../../common/store/types';
import {
  FlyoutV2EventTypes,
  FLYOUT_ORIGIN,
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TYPE,
} from '../../common/lib/telemetry';

const mockOpenSystemFlyout = jest.fn();
const mockReportEvent = jest.fn();

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      overlays: { openSystemFlyout: mockOpenSystemFlyout },
    },
  }),
}));

jest.mock('../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: () => false,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn(), location: { pathname: '/' } }),
}));

jest.mock('../../flyout_v2/shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: () => ({
    ownFocus: false,
    paddingSize: 'm',
    resizable: true,
    size: 's',
  }),
}));

jest.mock('../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../flyout_v2/entity/user/main', () => ({
  User: jest.fn(() => null),
}));

jest.mock('../alert_flyout_overview_tab_component/data_view_manager_bootstrap', () => ({
  DataViewManagerBootstrap: () => null,
}));

const mockServices = {
  overlays: { openSystemFlyout: mockOpenSystemFlyout },
  telemetry: { reportEvent: mockReportEvent },
} as unknown as StartServices;
const mockStore = {} as SecurityAppStore;

const props: DataGridCellValueElementProps = {
  columnId: 'user.name',
  isDetails: false,
  isExpanded: false,
  row: {
    id: '1',
    raw: {},
    flattened: { 'user.name': 'user-1' },
  },
  dataView: dataViewMock,
  setCellProps: jest.fn(),
  isExpandable: false,
  rowIndex: 0,
  colIndex: 0,
  fieldFormats: fieldFormatsMock,
  closePopover: jest.fn(),
  columnsMeta: undefined,
};

describe('UserCellRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenSystemFlyout.mockReturnValue({ onClose: new Promise<void>(() => {}) });
  });

  it('reports telemetry when opening the user flyout', async () => {
    const { getByTestId } = render(
      <UserCellRenderer {...props} services={mockServices} store={mockStore} />
    );

    await userEvent.click(getByTestId('one-discover-user-link'));

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.USER,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: FLYOUT_ORIGIN.TABLE_FIELD_LINK,
    });
  });
});
