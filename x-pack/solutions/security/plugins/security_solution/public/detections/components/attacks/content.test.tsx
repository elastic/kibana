/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

import { TestProviders } from '../../../common/mock';
import { AttacksPageContent, SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID } from './content';
import { KPIS_SECTION } from './kpis/kpis_section';
import { TABLE_SECTION_TEST_ID } from './table/table_section';
import { useKibana } from '../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../common/lib/telemetry';

jest.mock('../../../common/lib/kibana');

jest.mock('./kpis/kpis_section', () => ({
  KPIsSection: () => <div data-test-subj="attacks-kpis-section" />,
  KPIS_SECTION: 'attacks-kpis-section',
}));

jest.mock('./search_bar/search_bar_section', () => ({
  SearchBarSection: () => <div data-test-subj="search-bar-section" />,
}));

jest.mock(
  '../../../common/components/filter_by_assignees_popover/filter_by_assignees_popover',
  () => ({
    FilterByAssigneesPopover: () => <div data-test-subj="mock-filter-by-assignees-popover" />,
  })
);

jest.mock('./table/table_section', () => ({
  TableSection: () => <div data-test-subj="attacks-page-table-section" />,
  TABLE_SECTION_TEST_ID: 'attacks-page-table-section',
}));

jest.mock('./schedule_flyout', () => ({
  SchedulesFlyout: () => <div data-test-subj="mock-schedules-flyout" />,
}));

const dataView: DataView = createStubDataView({ spec: {} });

describe('AttacksPageContent', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        settings: {},
        telemetry: {
          reportEvent,
        },
      },
    });
  });

  it('should render correctly', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId('header-page-title')).toHaveTextContent('Attacks');
      expect(screen.getByTestId(TABLE_SECTION_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render `Schedule` button and report telemetry when clicked', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('schedule')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('schedule'));

    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.ScheduleFlyoutOpened, {
      source: 'attacks_page_header',
    });
  });

  it('should render `Connector` filter', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('connectorFilterButton')).toBeInTheDocument();
    });
  });

  it('should render `Assignee` button', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-filter-by-assignees-popover')).toBeInTheDocument();
    });
  });

  it('should render KPIs section', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(KPIS_SECTION)).toBeInTheDocument();
    });
  });
});
