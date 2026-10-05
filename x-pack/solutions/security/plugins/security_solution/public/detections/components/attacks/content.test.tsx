/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { of } from 'rxjs';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

import { TestProviders } from '../../../common/mock';
import {
  AttacksPageContent,
  ATTACKS_PAGE_TYPE_FILTER_TEST_ID,
  SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID,
} from './content';
import {
  GENERATIONS_MENU_ITEM_TEST_ID,
  RUN_MENU_ITEM_TEST_ID,
  SCHEDULE_MENU_ITEM_TEST_ID,
  SETTINGS_MENU_ITEM_TEST_ID,
} from './header/use_attacks_header_menu';
import { KPIS_SECTION } from './kpis/kpis_section';
import { TABLE_SECTION_TEST_ID } from './table/table_section';
import { useKibana } from '../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../common/lib/telemetry';
import { ATTACKS_PATH } from '../../../../common/constants';

import { useAttackDiscoveryControls } from '../../../attack_discovery/pages/use_attack_discovery_controls';

jest.mock('../../../common/lib/kibana');

jest.mock('./kpis/kpis_section', () => ({
  KPIsSection: () => <div data-test-subj="attacks-kpis-section" />,
  KPIS_SECTION: 'attacks-kpis-section',
}));

jest.mock('./search_bar/search_bar_section', () => ({
  SearchBarSection: () => <div data-test-subj="search-bar-section" />,
}));

jest.mock('./filters/type_filter', () => ({
  TypeFilter: () => <div data-test-subj="mock-type-filter" />,
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

jest.mock('../../../attack_discovery/pages/use_attack_discovery_controls', () => ({
  useAttackDiscoveryControls: jest.fn().mockReturnValue({
    connectorId: 'test-connector',
    isLoading: false,
    onGenerate: jest.fn(),
    openFlyout: jest.fn(),
    settingsFlyout: null,
  }),
}));

jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: jest.fn().mockReturnValue({ data: undefined }),
}));

jest.mock('./generations_control_center', () => ({
  GenerationsControlCenterFlyout: () => (
    <div data-test-subj="generationsControlCenterFlyout">
      {'Mock GenerationsControlCenterFlyout'}
    </div>
  ),
}));

jest.mock('../../../attack_discovery/pages/use_find_attack_discoveries', () => ({
  ...jest.requireActual('../../../attack_discovery/pages/use_find_attack_discoveries'),
  useFindAttackDiscoveries: jest.fn().mockReturnValue({ data: undefined }),
}));

const dataView: DataView = createStubDataView({ spec: {} });

const renderWithProviders = () =>
  render(
    <TestProviders>
      <MemoryRouter initialEntries={[ATTACKS_PATH]}>
        <AttacksPageContent dataView={dataView} />
      </MemoryRouter>
    </TestProviders>
  );

describe('AttacksPageContent', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: { capabilities: { advancedSettings: { save: true } } },
        http: { basePath: { prepend: (path: string) => path } },
        featureFlags: { useBooleanValue: jest.fn().mockReturnValue(false) },
        settings: {
          client: {
            get: jest.fn(),
            get$: jest.fn().mockReturnValue(of(undefined)),
            getUpdate$: jest.fn().mockReturnValue(of()),
          },
        },
        uiSettings: {
          get: jest.fn().mockReturnValue(false),
          set: jest.fn(),
        },
        notifications: {
          tours: {
            isEnabled: jest.fn().mockReturnValue(false),
          },
        },
        telemetry: {
          reportEvent,
        },
        storage: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
        },
      },
    });
  });

  it('should render correctly', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId(SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Attacks');
      expect(screen.getByTestId(TABLE_SECTION_TEST_ID)).toBeInTheDocument();
    });

    await openAppMenuOverflow();
    expect(screen.getByTestId(GENERATIONS_MENU_ITEM_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(RUN_MENU_ITEM_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(SETTINGS_MENU_ITEM_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(SCHEDULE_MENU_ITEM_TEST_ID)).toBeInTheDocument();
  });

  it('renders the header as a direct child of the page wrapper so it can stay sticky', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root).parentElement).toBe(
        screen.getByTestId(SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID)
      );
    });
  });

  it('hides the header and filters while the attacks table is in full screen', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeVisible();
      expect(screen.getByTestId(ATTACKS_PAGE_TYPE_FILTER_TEST_ID)).toBeVisible();
    });

    document.body.classList.add('euiDataGrid__restrictBody');

    await waitFor(() => {
      expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.title)).not.toBeInTheDocument();
      expect(screen.getByTestId(ATTACKS_PAGE_TYPE_FILTER_TEST_ID)).not.toBeVisible();
    });

    document.body.classList.remove('euiDataGrid__restrictBody');

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toBeVisible();
      expect(screen.getByTestId(ATTACKS_PAGE_TYPE_FILTER_TEST_ID)).toBeVisible();
    });
  });

  it('should render `Schedule` action and report telemetry when clicked', async () => {
    const openFlyoutMock = jest.fn();
    (useAttackDiscoveryControls as jest.Mock).mockReturnValue({
      connectorId: 'test-connector',
      isLoading: false,
      onGenerate: jest.fn(),
      openFlyout: openFlyoutMock,
      settingsFlyout: null,
    });

    renderWithProviders();

    await openAppMenuOverflow();
    fireEvent.click(screen.getByTestId(SCHEDULE_MENU_ITEM_TEST_ID));

    expect(openFlyoutMock).toHaveBeenCalledWith('schedule');
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.ScheduleFlyoutOpened, {
      source: 'attacks_page_header',
    });
  });

  it('should render `Settings` action and report telemetry when clicked', async () => {
    const openFlyoutMock = jest.fn();
    (useAttackDiscoveryControls as jest.Mock).mockReturnValue({
      connectorId: 'test-connector',
      isLoading: false,
      onGenerate: jest.fn(),
      openFlyout: openFlyoutMock,
      settingsFlyout: null,
    });

    renderWithProviders();

    await openAppMenuOverflow();
    fireEvent.click(screen.getByTestId(SETTINGS_MENU_ITEM_TEST_ID));

    expect(openFlyoutMock).toHaveBeenCalledWith('settings');
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.SettingsFlyoutOpened, {
      source: 'attacks_page_header',
    });
  });

  it('should render `Run` action and report telemetry when clicked', async () => {
    const onGenerateMock = jest.fn();
    (useAttackDiscoveryControls as jest.Mock).mockReturnValue({
      connectorId: 'test-connector',
      isLoading: false,
      onGenerate: onGenerateMock,
      openFlyout: jest.fn(),
      settingsFlyout: null,
    });

    renderWithProviders();

    await openAppMenuOverflow();
    fireEvent.click(screen.getByTestId(RUN_MENU_ITEM_TEST_ID));

    expect(onGenerateMock).toHaveBeenCalled();
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.GenerateClicked, {
      source: 'attacks_page_header',
    });
  });

  it('should not render the control center flyout before the `Generations` action is clicked', async () => {
    renderWithProviders();

    await openAppMenuOverflow();
    expect(screen.getByTestId(GENERATIONS_MENU_ITEM_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId('generationsControlCenterFlyout')).not.toBeInTheDocument();
  });

  it('should open the control center flyout and report telemetry when the `Generations` action is clicked', async () => {
    renderWithProviders();

    await openAppMenuOverflow();
    fireEvent.click(screen.getByTestId(GENERATIONS_MENU_ITEM_TEST_ID));

    expect(screen.getByTestId('generationsControlCenterFlyout')).toBeInTheDocument();
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.GenerationsControlCenterOpened, {
      source: 'attacks_page_header',
    });
  });

  it('should render `Type` filter', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('mock-type-filter')).toBeInTheDocument();
    });
  });

  it('should render `Connector` filter', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('connectorFilterButton')).toBeInTheDocument();
    });
  });

  it('should render `Assignee` button', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('mock-filter-by-assignees-popover')).toBeInTheDocument();
    });
  });

  it('should render KPIs section', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId(KPIS_SECTION)).toBeInTheDocument();
    });
  });
});
