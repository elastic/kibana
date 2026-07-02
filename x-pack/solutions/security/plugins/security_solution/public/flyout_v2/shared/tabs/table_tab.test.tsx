/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TableTab } from './table_tab';

const baseTableProps: Array<Record<string, unknown>> = [];

jest.mock('./base_table_tab', () => ({
  TableTab: (props: Record<string, unknown>) => {
    baseTableProps.push(props);
    return <div data-test-subj="mock-base-table" />;
  },
}));

jest.mock('../components/table_tab_tour', () => ({
  TableTabTour: () => <div data-test-subj="mock-tour" />,
}));

jest.mock('../components/table_tab_setting_button', () => ({
  TableTabSettingButton: () => <div data-test-subj="mock-setting" />,
}));

jest.mock('../components/table_field_name_cell', () => ({
  TableFieldNameCell: () => <div data-test-subj="mock-field-name" />,
}));

jest.mock('../components/open_flyout_link', () => ({
  OpenFlyoutLink: ({
    field,
    value,
    children,
  }: {
    field: string;
    value: string;
    children?: React.ReactNode;
  }) => (
    <span data-test-subj={`open-flyout-link-${field}`} data-value={value}>
      {children ?? value}
    </span>
  ),
}));

jest.mock('../../../common/components/links', () => ({
  PortOrServiceNameLink: ({
    portOrServiceName,
    children,
  }: {
    portOrServiceName: string;
    children?: React.ReactNode;
  }) => (
    <span data-test-subj="port-link" data-value={portOrServiceName}>
      {children}
    </span>
  ),
}));

jest.mock('../../../timelines/components/timeline/body/renderers/formatted_field_helpers', () => ({
  renderUrl: ({ value }: { value: string }) => <span data-test-subj="url-link">{value}</span>,
}));

jest.mock('../../document/main/hooks/use_highlighted_fields', () => ({
  useHighlightedFields: () => ({}),
}));

const mockStorage = { get: jest.fn(), set: jest.fn() };
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { storage: mockStorage } }),
}));

const hit = {
  id: '1',
  raw: { _id: '1' },
  flattened: {
    'host.name': 'my-host',
    '@timestamp': '2024-01-01T00:00:00.000Z',
    'user.name': ['a', 'b'],
  },
  isAnchor: false,
} as unknown as DataTableRecord;

const renderTableTab = () =>
  render(
    <IntlProvider locale="en">
      <TableTab hit={hit} renderCellActions={jest.fn()} />
    </IntlProvider>
  );

describe('<TableTab /> (shared document)', () => {
  beforeEach(() => {
    baseTableProps.length = 0;
    jest.clearAllMocks();
    mockStorage.get.mockReturnValue(undefined);
  });

  it('renders the base table and the pinning tour', () => {
    const { getByTestId } = renderTableTab();

    expect(getByTestId('mock-base-table')).toBeInTheDocument();
    expect(getByTestId('mock-tour')).toBeInTheDocument();
  });

  it('builds table items from hit.flattened, sorted by field name', () => {
    renderTableTab();

    const { items } = baseTableProps[0] as { items: Array<{ field: string; value: string }> };
    expect(items.map((i) => i.field)).toEqual(['@timestamp', 'host.name', 'user.name']);
  });

  it('stringifies array values and preserves the raw value for cell actions', () => {
    renderTableTab();

    const { items } = baseTableProps[0] as {
      items: Array<{ field: string; value: string; rawValue: unknown }>;
    };
    const userField = items.find((i) => i.field === 'user.name');
    expect(userField?.value).toBe('a, b');
    expect(userField?.rawValue).toEqual(['a', 'b']);
  });

  it('forwards pinning wiring to the base table', () => {
    renderTableTab();

    const props = baseTableProps[0] as { onPinField?: unknown; renderCellActions?: unknown };
    expect(typeof props.onPinField).toBe('function');
    expect(typeof props.renderCellActions).toBe('function');
  });

  it('renders values through OpenFlyoutLink, one link per value', () => {
    renderTableTab();

    const { renderValue } = baseTableProps[0] as {
      renderValue: (field: string, value: unknown) => React.ReactNode;
    };
    const { getAllByTestId } = render(
      <IntlProvider locale="en">{renderValue('user.name', 'a, b')}</IntlProvider>
    );

    // hit.flattened['user.name'] === ['a', 'b'] -> one OpenFlyoutLink per raw value.
    const links = getAllByTestId('open-flyout-link-user.name');
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.getAttribute('data-value'))).toEqual(['a', 'b']);
  });

  it('links the rule name field using the rule UUID as the flyout target', () => {
    const ruleHit = {
      id: 'r',
      raw: { _id: 'r' },
      flattened: {
        'kibana.alert.rule.name': 'My rule',
        'kibana.alert.rule.uuid': 'abc-123-uuid',
      },
      isAnchor: false,
    } as unknown as DataTableRecord;

    render(
      <IntlProvider locale="en">
        <TableTab hit={ruleHit} renderCellActions={jest.fn()} />
      </IntlProvider>
    );

    const { renderValue } = baseTableProps[0] as {
      renderValue: (field: string, value: unknown) => React.ReactNode;
    };
    const { getByTestId } = render(
      <IntlProvider locale="en">{renderValue('kibana.alert.rule.name', 'My rule')}</IntlProvider>
    );

    const link = getByTestId('open-flyout-link-kibana.alert.rule.name');
    // Flyout target is the UUID, but the displayed text stays the rule name.
    expect(link.getAttribute('data-value')).toBe('abc-123-uuid');
    expect(link).toHaveTextContent('My rule');
  });

  it('renders the rule name as plain text when no rule UUID is present', () => {
    const ruleHit = {
      id: 'r',
      raw: { _id: 'r' },
      flattened: { 'kibana.alert.rule.name': 'My rule' },
      isAnchor: false,
    } as unknown as DataTableRecord;

    render(
      <IntlProvider locale="en">
        <TableTab hit={ruleHit} renderCellActions={jest.fn()} />
      </IntlProvider>
    );

    const { renderValue } = baseTableProps[0] as {
      renderValue: (field: string, value: unknown) => React.ReactNode;
    };
    const { getByText, queryByTestId } = render(
      <IntlProvider locale="en">{renderValue('kibana.alert.rule.name', 'My rule')}</IntlProvider>
    );

    expect(queryByTestId('open-flyout-link-kibana.alert.rule.name')).not.toBeInTheDocument();
    expect(getByText('My rule')).toBeInTheDocument();
  });

  it('renders port fields as external port links, not flyout links', () => {
    const portHit = {
      id: 'p',
      raw: { _id: 'p' },
      flattened: { 'destination.port': 443 },
      isAnchor: false,
    } as unknown as DataTableRecord;

    render(
      <IntlProvider locale="en">
        <TableTab hit={portHit} renderCellActions={jest.fn()} />
      </IntlProvider>
    );

    const { renderValue } = baseTableProps[0] as {
      renderValue: (field: string, value: unknown) => React.ReactNode;
    };
    const { getByTestId, queryByTestId } = render(
      <IntlProvider locale="en">{renderValue('destination.port', '443')}</IntlProvider>
    );

    expect(getByTestId('port-link')).toHaveAttribute('data-value', '443');
    expect(queryByTestId('open-flyout-link-destination.port')).not.toBeInTheDocument();
  });

  it('renders url fields as external url links, not flyout links', () => {
    const urlHit = {
      id: 'u',
      raw: { _id: 'u' },
      flattened: { 'event.url': 'https://example.com/x' },
      isAnchor: false,
    } as unknown as DataTableRecord;

    render(
      <IntlProvider locale="en">
        <TableTab hit={urlHit} renderCellActions={jest.fn()} />
      </IntlProvider>
    );

    const { renderValue } = baseTableProps[0] as {
      renderValue: (field: string, value: unknown) => React.ReactNode;
    };
    const { getByTestId, queryByTestId } = render(
      <IntlProvider locale="en">{renderValue('event.url', 'https://example.com/x')}</IntlProvider>
    );

    expect(getByTestId('url-link')).toHaveTextContent('https://example.com/x');
    expect(queryByTestId('open-flyout-link-event.url')).not.toBeInTheDocument();
  });
});
