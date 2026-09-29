/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { HostCellRenderer } from './host_cell_renderer';
import { Host } from '../../flyout_v2/entity/host/main';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import type { StartServices } from '../../types';
import type { SecurityAppStore } from '../../common/store/types';
import {
  FlyoutV2EventTypes,
  FLYOUT_ORIGIN,
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TYPE,
} from '../../common/lib/telemetry';

const mockOpenSystemFlyout = vi.fn();
const mockReportEvent = vi.fn();
vi.mock('../../common/lib/kibana', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        overlays: { openSystemFlyout: mockOpenSystemFlyout },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/hooks/is_in_security_app', () => {
  const mocked = {
    useIsInSecurityApp: () => true,
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useHistory: () => ({ push: vi.fn(), location: { pathname: '/' } }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-redux-v7', () => {
  const mocked = {
    ...require('react-redux-v7'),
    useStore: () => ({}),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../flyout_v2/shared/hooks/use_default_flyout_properties', () => {
  const mocked = {
    useDefaultDocumentFlyoutProperties: () => ({
      ownFocus: false,
      paddingSize: 'm',
      resizable: true,
      size: 's',
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../flyout_v2/shared/components/flyout_provider', () => {
  const mocked = {
    flyoutProviders: vi.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../flyout_v2/entity/host/main', () => {
  const mocked = {
    Host: vi.fn(() => null),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../alert_flyout_overview_tab_component/data_view_manager_bootstrap', () => {
  const mocked = {
    DataViewManagerBootstrap: () => null,
  };
  return { ...mocked, default: mocked };
});

const mockServices = {
  overlays: { openSystemFlyout: mockOpenSystemFlyout },
  telemetry: { reportEvent: mockReportEvent },
} as unknown as StartServices;
const mockStore = {} as SecurityAppStore;

const baseProps: DataGridCellValueElementProps = {
  columnId: 'host.name',
  isDetails: false,
  isExpanded: false,
  row: {
    id: '1',
    raw: {},
    flattened: {
      'host.name': 'host-1',
    },
  },
  dataView: dataViewMock,
  setCellProps: vi.fn(),
  isExpandable: false,
  rowIndex: 0,
  colIndex: 0,
  fieldFormats: fieldFormatsMock,
  closePopover: vi.fn(),
  columnsMeta: undefined,
};

describe('HostCellRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenSystemFlyout.mockReturnValue({ onClose: new Promise<void>(() => {}) });
  });

  it('should render a single host name as a clickable link', () => {
    const { getByTestId } = render(
      <HostCellRenderer {...baseProps} services={mockServices} store={mockStore} />
    );

    const link = getByTestId('one-discover-host-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('host-1');
  });

  it('should open the host system flyout with the source document on click', async () => {
    const { getByTestId } = render(
      <HostCellRenderer {...baseProps} services={mockServices} store={mockStore} />
    );

    await userEvent.click(getByTestId('one-discover-host-link'));

    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);

    const providerArgs = (flyoutProviders as Mock).mock.calls[0][0];
    const hostElement = React.Children.toArray(providerArgs.children.props.children).find(
      (child): child is React.ReactElement => React.isValidElement(child) && child.type === Host
    );

    expect(hostElement).toBeDefined();
    expect(hostElement?.props.hostName).toBe('host-1');
    expect(hostElement?.props.hit).toBe(baseProps.row);
    expect(mockReportEvent).toHaveBeenCalledWith(FlyoutV2EventTypes.FlyoutOpened, {
      surface: FLYOUT_SURFACE.FLYOUT,
      flyoutType: FLYOUT_TYPE.HOST,
      tool: undefined,
      session: FLYOUT_SESSION_KIND.START,
      origin: FLYOUT_ORIGIN.TABLE_FIELD_LINK,
    });
  });

  it('should render multiple host names as separate links', () => {
    const props = {
      ...baseProps,
      row: {
        ...baseProps.row,
        flattened: {
          'host.name': ['host-1', 'host-2', 'host-3'],
        },
      },
    };

    const { getAllByTestId } = render(
      <HostCellRenderer {...props} services={mockServices} store={mockStore} />
    );

    const links = getAllByTestId('one-discover-host-link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveTextContent('host-1');
    expect(links[1]).toHaveTextContent('host-2');
    expect(links[2]).toHaveTextContent('host-3');
  });

  it('should render an empty tag when the value is null', () => {
    const props = {
      ...baseProps,
      row: {
        ...baseProps.row,
        flattened: {
          'host.name': null,
        },
      },
    };

    const { container } = render(
      <HostCellRenderer {...props} services={mockServices} store={mockStore} />
    );

    expect(container.querySelector('[data-test-subj="one-discover-host-link"]')).toBeNull();
  });

  it('should render an empty tag when the value is an empty array', () => {
    const props = {
      ...baseProps,
      row: {
        ...baseProps.row,
        flattened: {
          'host.name': [],
        },
      },
    };

    const { container } = render(
      <HostCellRenderer {...props} services={mockServices} store={mockStore} />
    );

    expect(container.querySelector('[data-test-subj="one-discover-host-link"]')).toBeNull();
  });
});
