/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';
import { dataTableActions, TableId } from '@kbn/securitysolution-data-table';
import { HostsType } from '../../../explore/hosts/store/model';
import { TestProviders } from '../../mock';
import type { EventsQueryTabBodyComponentProps } from './events_query_tab_body';
import { ALERTS_EVENTS_HISTOGRAM_ID, EventsQueryTabBody } from './events_query_tab_body';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { licenseService } from '../../hooks/use_license';
import { mockHistory } from '../../mock/router';
import { DEFAULT_EVENTS_STACK_BY_VALUE } from './histogram_configurations';
import { useUserPrivileges } from '../user_privileges';
import userEvent from '@testing-library/user-event';

vi.mock('../user_privileges');

const mockGetDefaultControlColumn = vi.fn();
vi.mock('../../../timelines/components/timeline/body/control_columns', () => {
  const mocked = {
    getDefaultControlColumn: (props: number) => mockGetDefaultControlColumn(props),
  };
  return { ...mocked, default: mocked };
});

vi.mock(
  '../../../detections/components/alerts_table/timeline_actions/use_add_bulk_to_timeline',
  () => {
    const mocked = {
      useAddBulkToTimelineAction: vi.fn().mockReturnValue([]),
    };
    return { ...mocked, default: mocked };
  }
);

vi.mock('../../lib/kibana', async () => {
  const original = await vi.importActual('../../lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        cases: {
          ui: {
            getCasesContext: vi.fn(),
          },
          helpers: {
            canUseCases: () => [],
          },
          hooks: {
            useCasesAddToNewCaseFlyout: () => () => {},
            useCasesAddToExistingCaseModal: () => () => {},
          },
        },
      },
    }),
  };
});

vi.mock('../visualization_actions/actions');
vi.mock('../visualization_actions/lens_embeddable');

vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useHistory: () => mockHistory,
    useLocation: vi.fn().mockReturnValue({ pathname: '/test' }),
  };
  return { ...mocked, default: mocked };
});

const FakeStatefulEventsViewer = ({
  topRightMenuOptions,
}: {
  topRightMenuOptions: JSX.Element;
}) => (
  <div>
    {topRightMenuOptions}
    {'MockedStatefulEventsViewer'}
  </div>
);
vi.mock('../events_viewer', () => ({
  get StatefulEventsViewer() {
    return FakeStatefulEventsViewer;
  },
}));

vi.mock('../../containers/use_full_screen', () => {
  const mocked = {
    useGlobalFullScreen: vi.fn().mockReturnValue({
      globalFullScreen: false,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: vi.fn(),
    isEnterprise: vi.fn(() => false),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

describe('EventsQueryTabBody', () => {
  const commonProps: EventsQueryTabBodyComponentProps = {
    indexNames: ['test-index'],
    tableId: TableId.test,
    type: HostsType.page,
    endDate: new Date('2000').toISOString(),
    startDate: new Date('2000').toISOString(),
    additionalFilters: [],
  };

  beforeEach(() => {
    (useUserPrivileges as Mock).mockReturnValue({
      notesPrivileges: { read: true },
    });
  });

  it('renders EventsViewer', () => {
    const { queryByText } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(queryByText('MockedStatefulEventsViewer')).toBeInTheDocument();
    expect(mockGetDefaultControlColumn).toHaveBeenCalledWith(5);
  });

  it('renders the matrix histogram when globalFullScreen is false', () => {
    (useGlobalFullScreen as Mock).mockReturnValueOnce({
      globalFullScreen: false,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(queryByTestId(`${ALERTS_EVENTS_HISTOGRAM_ID}Panel`)).toBeInTheDocument();
  });

  it("doesn't render the matrix histogram when globalFullScreen is true", () => {
    (useGlobalFullScreen as Mock).mockReturnValueOnce({
      globalFullScreen: true,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(queryByTestId(`${ALERTS_EVENTS_HISTOGRAM_ID}Panel`)).not.toBeInTheDocument();
  });

  it('renders the matrix histogram stacked by events default value', () => {
    const result = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(result.getByTestId('header-section-supplements').querySelector('select')?.value).toEqual(
      DEFAULT_EVENTS_STACK_BY_VALUE
    );
  });

  it('renders the matrix histogram stacked by alerts default value', async () => {
    const result = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    await userEvent.click(result.getByTestId('showExternalAlertsCheckbox'));

    expect(result.getByTestId('header-section-supplements').querySelector('select')?.value).toEqual(
      'event.module'
    );
  });

  it('deletes query when unmouting', () => {
    const mockDeleteQuery = vi.fn();
    const { unmount } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} deleteQuery={mockDeleteQuery} />
      </TestProviders>
    );
    unmount();

    expect(mockDeleteQuery).toHaveBeenCalled();
  });

  it('initializes t-grid', () => {
    const spy = vi.spyOn(dataTableActions, 'initializeDataTableSettings');
    render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(spy).toHaveBeenCalled();
  });

  it('should have 5 columns on Action bar for non-Enterprise user', () => {
    render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(mockGetDefaultControlColumn).toHaveBeenCalledWith(5);
  });

  it('should have 4 columns on Action bar for non-Enterprise user and if user does not have Notes privileges', () => {
    (useUserPrivileges as Mock).mockReturnValue({ notesPrivileges: { read: false } });

    render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(mockGetDefaultControlColumn).toHaveBeenCalledWith(4);
  });

  it('should have 6 columns on Action bar for Enterprise user', () => {
    const licenseServiceMock = licenseService as Mocked<typeof licenseService>;
    licenseServiceMock.isEnterprise.mockReturnValue(true);

    render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(mockGetDefaultControlColumn).toHaveBeenCalledWith(6);
  });

  it('should have 5 columns on Action bar for Enterprise user and if user does not have Notes privileges', () => {
    const licenseServiceMock = licenseService as Mocked<typeof licenseService>;
    licenseServiceMock.isEnterprise.mockReturnValue(true);
    (useUserPrivileges as Mock).mockReturnValue({ notesPrivileges: { read: false } });

    render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(mockGetDefaultControlColumn).toHaveBeenCalledWith(5);
  });
});
