/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { TestProviders } from '../../../common/mock';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import {
  alertCountColumn,
  documentCountColumn,
  fieldColumn,
  getColumns,
  hostPrevalenceColumn,
  LicenseProtectedCell,
  type PrevalenceDetailsRow,
  userPrevalenceColumn,
} from './get_columns';
import {
  PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID,
  PREVALENCE_DETAILS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID,
  PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID,
} from '../test_ids';

jest.mock('../../../common/components/event_details/investigate_in_timeline_button', () => ({
  InvestigateInTimelineButton: ({
    children,
    'data-test-subj': dataTestSubj,
  }: {
    children: React.ReactNode;
    'data-test-subj': string;
  }) => <div data-test-subj={dataTestSubj}>{children}</div>,
}));

jest.mock('../../../common/components/event_details/use_action_cell_data_provider', () => ({
  getDataProvider: jest.fn(() => ({ id: 'mock-provider', field: 'field', value: 'value' })),
  getDataProviderAnd: jest.fn(() => ({ id: 'mock-and-provider' })),
}));

const MockChildLink = ({
  field,
  value,
  children,
}: {
  field: string;
  value: string;
  children?: React.ReactNode;
}) => (
  <div data-test-subj="mockChildLink" data-field={field} data-value={value}>
    {children}
  </div>
);

const defaultRow: PrevalenceDetailsRow = {
  field: 'host.name',
  values: ['host-1'],
  alertCount: 2,
  docCount: 5,
  hostPrevalence: 0.5,
  userPrevalence: 0.25,
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-07T00:00:00.000Z',
  isPlatinumPlus: true,
  scopeId: 'alerts-page',
  canUseTimeline: true,
};

const renderComponent = (ui: React.ReactElement) => render(<TestProviders>{ui}</TestProviders>);

/**
 * Casts a column to one with a render function receiving the full row,
 * which is the signature used by computed and field-less columns.
 */
const callRender = (
  column: EuiBasicTableColumn<PrevalenceDetailsRow>,
  data: PrevalenceDetailsRow
): React.ReactElement =>
  (column as unknown as { render: (d: PrevalenceDetailsRow) => React.ReactElement }).render(data);

describe('LicenseProtectedCell', () => {
  it('renders with the upsell cell test id', () => {
    renderComponent(<LicenseProtectedCell />);

    expect(screen.getByTestId(PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID)).toBeInTheDocument();
  });
});

describe('fieldColumn', () => {
  it('renders the field name', () => {
    const render_ = (fieldColumn as unknown as { render: (f: string) => React.ReactElement })
      .render;
    renderComponent(render_('host.name'));

    expect(screen.getByText('host.name')).toBeInTheDocument();
  });
});

describe('alertCountColumn', () => {
  describe('when alertCount is 0', () => {
    it('does not render the count text button', () => {
      const row = { ...defaultRow, alertCount: 0 };
      renderComponent(callRender(alertCountColumn(true), row));

      expect(screen.queryByTestId(PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID)).toBeNull();
    });

    it('does not render the investigate in timeline button', () => {
      const row = { ...defaultRow, alertCount: 0 };
      renderComponent(callRender(alertCountColumn(true), row));

      expect(
        screen.queryByTestId(PREVALENCE_DETAILS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)
      ).toBeNull();
    });
  });

  describe('when isInSecurityApp is false', () => {
    it('renders a plain text count instead of a timeline button', () => {
      renderComponent(callRender(alertCountColumn(false), defaultRow));

      expect(
        screen.getByTestId(PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID)
      ).toBeInTheDocument();
    });

    it('does not render the investigate in timeline button', () => {
      renderComponent(callRender(alertCountColumn(false), defaultRow));

      expect(
        screen.queryByTestId(PREVALENCE_DETAILS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)
      ).toBeNull();
    });
  });

  describe('when canUseTimeline is false', () => {
    it('renders a plain text count instead of a timeline button', () => {
      const row = { ...defaultRow, canUseTimeline: false };
      renderComponent(callRender(alertCountColumn(true), row));

      expect(
        screen.getByTestId(PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID)
      ).toBeInTheDocument();
    });
  });

  describe('when isInSecurityApp is true and canUseTimeline is true', () => {
    it('renders the investigate in timeline button', () => {
      renderComponent(callRender(alertCountColumn(true), defaultRow));

      expect(
        screen.getByTestId(PREVALENCE_DETAILS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)
      ).toBeInTheDocument();
    });

    it('does not render the plain text count button', () => {
      renderComponent(callRender(alertCountColumn(true), defaultRow));

      expect(screen.queryByTestId(PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID)).toBeNull();
    });
  });
});

describe('documentCountColumn', () => {
  describe('when docCount is 0', () => {
    it('does not render the count text button', () => {
      const row = { ...defaultRow, docCount: 0 };
      renderComponent(callRender(documentCountColumn(true), row));

      expect(screen.queryByTestId(PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID)).toBeNull();
    });
  });

  describe('when isInSecurityApp is false', () => {
    it('renders a plain text count', () => {
      renderComponent(callRender(documentCountColumn(false), defaultRow));

      expect(
        screen.getByTestId(PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID)
      ).toBeInTheDocument();
    });
  });

  describe('when canUseTimeline is false', () => {
    it('renders a plain text count', () => {
      const row = { ...defaultRow, canUseTimeline: false };
      renderComponent(callRender(documentCountColumn(true), row));

      expect(
        screen.getByTestId(PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID)
      ).toBeInTheDocument();
    });
  });

  describe('when isInSecurityApp is true and canUseTimeline is true', () => {
    it('renders the investigate in timeline button', () => {
      renderComponent(callRender(documentCountColumn(true), defaultRow));

      expect(
        screen.getByTestId(PREVALENCE_DETAILS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)
      ).toBeInTheDocument();
    });
  });
});

describe('hostPrevalenceColumn', () => {
  describe('when isPlatinumPlus is true', () => {
    it('renders the host prevalence percentage', () => {
      renderComponent(callRender(hostPrevalenceColumn, defaultRow));

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('does not render the upsell cell', () => {
      renderComponent(callRender(hostPrevalenceColumn, defaultRow));

      expect(screen.queryByTestId(PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID)).toBeNull();
    });
  });

  describe('when isPlatinumPlus is false', () => {
    it('renders the license protected cell', () => {
      const row = { ...defaultRow, isPlatinumPlus: false };
      renderComponent(callRender(hostPrevalenceColumn, row));

      expect(screen.getByTestId(PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID)).toBeInTheDocument();
    });

    it('does not render the percentage', () => {
      const row = { ...defaultRow, isPlatinumPlus: false };
      renderComponent(callRender(hostPrevalenceColumn, row));

      expect(screen.queryByText('50%')).toBeNull();
    });
  });

  it('rounds the prevalence to nearest integer percentage', () => {
    const row = { ...defaultRow, hostPrevalence: 0.336 };
    renderComponent(callRender(hostPrevalenceColumn, row));

    expect(screen.getByText('34%')).toBeInTheDocument();
  });
});

describe('userPrevalenceColumn', () => {
  describe('when isPlatinumPlus is true', () => {
    it('renders the user prevalence percentage', () => {
      renderComponent(callRender(userPrevalenceColumn, defaultRow));

      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('does not render the upsell cell', () => {
      renderComponent(callRender(userPrevalenceColumn, defaultRow));

      expect(screen.queryByTestId(PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID)).toBeNull();
    });
  });

  describe('when isPlatinumPlus is false', () => {
    it('renders the license protected cell', () => {
      const row = { ...defaultRow, isPlatinumPlus: false };
      renderComponent(callRender(userPrevalenceColumn, row));

      expect(screen.getByTestId(PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID)).toBeInTheDocument();
    });

    it('does not render the percentage', () => {
      const row = { ...defaultRow, isPlatinumPlus: false };
      renderComponent(callRender(userPrevalenceColumn, row));

      expect(screen.queryByText('25%')).toBeNull();
    });
  });

  it('rounds the prevalence to nearest integer percentage', () => {
    const row = { ...defaultRow, userPrevalence: 0.124 };
    renderComponent(callRender(userPrevalenceColumn, row));

    expect(screen.getByText('12%')).toBeInTheDocument();
  });
});

describe('getColumns', () => {
  it('returns 6 columns', () => {
    const columns = getColumns(jest.fn() as unknown as CellActionRenderer, true, 'alerts-page');

    expect(columns).toHaveLength(6);
  });

  describe('value column', () => {
    it('renders cell actions when renderCellActions is provided', () => {
      const renderCellActions = jest.fn(({ children }: { children: React.ReactNode }) => (
        <div data-test-subj="cell-actions">{children}</div>
      )) as unknown as CellActionRenderer;
      const columns = getColumns(renderCellActions, true, 'alerts-page');
      const valueColumn = columns[1];

      renderComponent(callRender(valueColumn, defaultRow));

      expect(screen.getByTestId('cell-actions')).toBeInTheDocument();
    });

    it('passes the correct field, value, and scopeId to renderCellActions', () => {
      const renderCellActionsMock = jest.fn(() => null);
      const renderCellActions = renderCellActionsMock as unknown as CellActionRenderer;
      const columns = getColumns(renderCellActions, true, 'my-scope');
      const valueColumn = columns[1];

      renderComponent(callRender(valueColumn, defaultRow));

      expect(renderCellActionsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'host.name',
          value: 'host-1',
          scopeId: 'my-scope',
        })
      );
    });

    it('renders plain text values when renderCellActions is null', () => {
      const columns = getColumns(null as unknown as CellActionRenderer, true, 'alerts-page');
      const valueColumn = columns[1];
      const row = { ...defaultRow, values: ['value-one'] };

      renderComponent(callRender(valueColumn, row));

      expect(screen.getByText('value-one')).toBeInTheDocument();
    });

    it('wraps each value in a ChildLink when RenderChildLink is provided', () => {
      const columns = getColumns(
        null as unknown as CellActionRenderer,
        true,
        'alerts-page',
        MockChildLink
      );
      const valueColumn = columns[1];
      const row = { ...defaultRow, field: 'source.ip', values: ['10.0.0.1'] };

      renderComponent(callRender(valueColumn, row));

      const previewLink = screen.getByTestId('mockChildLink');
      expect(previewLink).toHaveAttribute('data-field', 'source.ip');
      expect(previewLink).toHaveAttribute('data-value', '10.0.0.1');
    });

    it('renders plain text without ChildLink when RenderChildLink is not provided', () => {
      const columns = getColumns(null as unknown as CellActionRenderer, true, 'alerts-page');
      const valueColumn = columns[1];
      const row = { ...defaultRow, values: ['plain-value'] };

      renderComponent(callRender(valueColumn, row));

      expect(screen.getByText('plain-value')).toBeInTheDocument();
      expect(screen.queryByTestId('mockChildLink')).not.toBeInTheDocument();
    });

    it('renders one item per value', () => {
      const renderCellActionsMock = jest.fn(({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ));
      const renderCellActions = renderCellActionsMock as unknown as CellActionRenderer;
      const columns = getColumns(renderCellActions, true, 'alerts-page');
      const valueColumn = columns[1];
      const row = { ...defaultRow, values: ['val-a', 'val-b', 'val-c'] };

      renderComponent(callRender(valueColumn, row));

      expect(renderCellActionsMock).toHaveBeenCalledTimes(3);
    });
  });
});
