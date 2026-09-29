/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { of } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

import { TestProviders } from '../../../common/mock';
import {
  AttacksPageContent,
  ATTACKS_PAGE_GENERATIONS_BUTTON_TEST_ID,
  SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID,
} from './content';
import { KPIS_SECTION } from './kpis/kpis_section';
import { TABLE_SECTION_TEST_ID } from './table/table_section';
import { useKibana } from '../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../common/lib/telemetry';

import { useAttackDiscoveryControls } from '../../../attack_discovery/pages/use_attack_discovery_controls';

vi.mock('../../../common/lib/kibana');

vi.mock('./kpis/kpis_section', () => {
  const mocked = {
    KPIsSection: () => <div data-test-subj="attacks-kpis-section" />,
    KPIS_SECTION: 'attacks-kpis-section',
  };
  return { ...mocked, default: mocked };
});

vi.mock('./search_bar/search_bar_section', () => {
  const mocked = {
    SearchBarSection: () => <div data-test-subj="search-bar-section" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./filters/type_filter', () => {
  const mocked = {
    TypeFilter: () => <div data-test-subj="mock-type-filter" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock(
  '../../../common/components/filter_by_assignees_popover/filter_by_assignees_popover',
  () => {
    const mocked = {
      FilterByAssigneesPopover: () => <div data-test-subj="mock-filter-by-assignees-popover" />,
    };
    return { ...mocked, default: mocked };
  }
);

vi.mock('./table/table_section', () => {
  const mocked = {
    TableSection: () => <div data-test-subj="attacks-page-table-section" />,
    TABLE_SECTION_TEST_ID: 'attacks-page-table-section',
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../attack_discovery/pages/use_attack_discovery_controls', () => {
  const mocked = {
    useAttackDiscoveryControls: vi.fn().mockReturnValue({
      connectorId: 'test-connector',
      isLoading: false,
      onGenerate: vi.fn(),
      openFlyout: vi.fn(),
      settingsFlyout: null,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/inference-connectors', () => {
  const mocked = {
    useLoadConnectors: vi.fn().mockReturnValue({ data: undefined }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./generations_control_center', () => {
  const mocked = {
    GenerationsControlCenterFlyout: () => (
      <div data-test-subj="generationsControlCenterFlyout">
        {'Mock GenerationsControlCenterFlyout'}
      </div>
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../attack_discovery/pages/use_find_attack_discoveries', async () => {
  const mocked = {
    ...(await vi.importActual('../../../attack_discovery/pages/use_find_attack_discoveries')),
    useFindAttackDiscoveries: vi.fn().mockReturnValue({ data: undefined }),
  };
  return { ...mocked, default: mocked };
});

const dataView: DataView = createStubDataView({ spec: {} });

describe('AttacksPageContent', () => {
  const reportEvent = vi.fn();

  beforeEach(() => {
    (useKibana as Mock).mockReturnValue({
      services: {
        application: { capabilities: { advancedSettings: { save: true } } },
        featureFlags: { useBooleanValue: vi.fn().mockReturnValue(false) },
        settings: {
          client: {
            get: vi.fn(),
            get$: vi.fn().mockReturnValue(of(undefined)),
            getUpdate$: vi.fn().mockReturnValue(of()),
          },
        },
        uiSettings: {
          get: vi.fn().mockReturnValue(false),
          set: vi.fn(),
        },
        notifications: {
          tours: {
            isEnabled: vi.fn().mockReturnValue(false),
          },
        },
        telemetry: {
          reportEvent,
        },
        storage: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn(),
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
    const openFlyoutMock = vi.fn();
    (useAttackDiscoveryControls as Mock).mockReturnValue({
      connectorId: 'test-connector',
      isLoading: false,
      onGenerate: vi.fn(),
      openFlyout: openFlyoutMock,
      settingsFlyout: null,
    });

    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('schedule')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('schedule'));

    expect(openFlyoutMock).toHaveBeenCalledWith('schedule');
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.ScheduleFlyoutOpened, {
      source: 'attacks_page_header',
    });
  });

  it('should render `Settings` button and report telemetry when clicked', async () => {
    const openFlyoutMock = vi.fn();
    (useAttackDiscoveryControls as Mock).mockReturnValue({
      connectorId: 'test-connector',
      isLoading: false,
      onGenerate: vi.fn(),
      openFlyout: openFlyoutMock,
      settingsFlyout: null,
    });

    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('settings'));

    expect(openFlyoutMock).toHaveBeenCalledWith('settings');
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.SettingsFlyoutOpened, {
      source: 'attacks_page_header',
    });
  });

  it('should render `Run` button and report telemetry when clicked', async () => {
    const onGenerateMock = vi.fn();
    (useAttackDiscoveryControls as Mock).mockReturnValue({
      connectorId: 'test-connector',
      isLoading: false,
      onGenerate: onGenerateMock,
      openFlyout: vi.fn(),
      settingsFlyout: null,
    });

    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('run')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('run'));

    expect(onGenerateMock).toHaveBeenCalled();
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.GenerateClicked, {
      source: 'attacks_page_header',
    });
  });

  it('should render the `Generations` button', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(ATTACKS_PAGE_GENERATIONS_BUTTON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should not render the control center flyout before the `Generations` button is clicked', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(ATTACKS_PAGE_GENERATIONS_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('generationsControlCenterFlyout')).not.toBeInTheDocument();
  });

  it('should open the control center flyout when the `Generations` button is clicked', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(ATTACKS_PAGE_GENERATIONS_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId(ATTACKS_PAGE_GENERATIONS_BUTTON_TEST_ID));

    expect(screen.getByTestId('generationsControlCenterFlyout')).toBeInTheDocument();
  });

  it('should report telemetry when the `Generations` button is clicked', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(ATTACKS_PAGE_GENERATIONS_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId(ATTACKS_PAGE_GENERATIONS_BUTTON_TEST_ID));

    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.GenerationsControlCenterOpened, {
      source: 'attacks_page_header',
    });
  });

  it('should render `Type` filter', async () => {
    render(
      <TestProviders>
        <AttacksPageContent dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-type-filter')).toBeInTheDocument();
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
