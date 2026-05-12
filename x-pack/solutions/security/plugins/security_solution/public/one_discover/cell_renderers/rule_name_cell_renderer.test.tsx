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
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { RuleNameCellRenderer } from './rule_name_cell_renderer';
import type { StartServices } from '../../types';
import type { SecurityAppStore } from '../../common/store/types';

const mockOpenSystemFlyout = jest.fn();
jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      overlays: { openSystemFlyout: mockOpenSystemFlyout },
    },
  }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn(), location: { pathname: '/' } }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useStore: () => ({}),
}));

jest.mock('../../flyout_v2/shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: () => ({
    ownFocus: false,
    paddingSize: 'm',
    resizable: true,
    size: 's',
  }),
}));

jest.mock('../../flyout_v2/shared/utils/build_flyout_content', () => ({
  buildFlyoutContent: jest.fn((field: string, value: string) => {
    if (field === 'kibana.alert.rule.name' && value) {
      return <div data-test-subj="mock-rule-flyout" />;
    }
    return null;
  }),
}));

jest.mock('../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockServices = {
  overlays: { openSystemFlyout: mockOpenSystemFlyout },
} as unknown as StartServices;
const mockStore = {} as SecurityAppStore;

const baseProps: DataGridCellValueElementProps = {
  columnId: 'kibana.alert.rule.name',
  isDetails: false,
  isExpanded: false,
  row: {
    id: '1',
    raw: {},
    flattened: {
      'kibana.alert.rule.name': 'Test Rule',
      [ALERT_RULE_UUID]: 'rule-uuid-123',
    },
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

describe('RuleNameCellRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render rule name as a clickable link', () => {
    const { getByTestId } = render(
      <RuleNameCellRenderer {...baseProps} services={mockServices} store={mockStore} />
    );

    const link = getByTestId('one-discover-rule-name-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('Test Rule');
  });

  it('should open system flyout on click', async () => {
    const { getByTestId } = render(
      <RuleNameCellRenderer {...baseProps} services={mockServices} store={mockStore} />
    );

    await userEvent.click(getByTestId('one-discover-rule-name-link'));
    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
  });

  it('should render empty tag when rule name is null', () => {
    const props = {
      ...baseProps,
      row: {
        ...baseProps.row,
        flattened: {
          'kibana.alert.rule.name': null,
          [ALERT_RULE_UUID]: 'rule-uuid-123',
        },
      },
    };

    const { container } = render(
      <RuleNameCellRenderer {...props} services={mockServices} store={mockStore} />
    );

    expect(container.querySelector('[data-test-subj="one-discover-rule-name-link"]')).toBeNull();
  });

  it('should render plain text when rule UUID is missing', () => {
    const props = {
      ...baseProps,
      row: {
        ...baseProps.row,
        flattened: {
          'kibana.alert.rule.name': 'Test Rule',
        },
      },
    };

    const { getByTestId, queryByTestId } = render(
      <RuleNameCellRenderer {...props} services={mockServices} store={mockStore} />
    );

    expect(getByTestId('one-discover-rule-name')).toHaveTextContent('Test Rule');
    expect(queryByTestId('one-discover-rule-name-link')).toBeNull();
  });

  it('should handle array values for rule name', () => {
    const props = {
      ...baseProps,
      row: {
        ...baseProps.row,
        flattened: {
          'kibana.alert.rule.name': ['Array Rule Name'],
          [ALERT_RULE_UUID]: ['rule-uuid-456'],
        },
      },
    };

    const { getByTestId } = render(
      <RuleNameCellRenderer {...props} services={mockServices} store={mockStore} />
    );

    expect(getByTestId('one-discover-rule-name-link')).toHaveTextContent('Array Rule Name');
  });
});
