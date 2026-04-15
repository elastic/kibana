/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import {
  PrevalenceDetailsView,
  resetColdFrozenTierCalloutDismissedStateForTests,
} from './prevalence_details_view';
import {
  PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID,
  PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID,
  PREVALENCE_DETAILS_DATE_PICKER_TEST_ID,
  PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID,
  PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID,
  PREVALENCE_DETAILS_TABLE_TEST_ID,
  PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID,
  PREVALENCE_DETAILS_UPSELL_TEST_ID,
} from '../test_ids';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { getColumns } from '../utils/get_columns';
import { usePrevalence } from '../hooks/use_prevalence';
import { TestProviders } from '../../../common/mock';
import { licenseService } from '../../../common/hooks/use_license';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { useUserPrivileges } from '../../../common/components/user_privileges';

jest.mock('../../../common/components/user_privileges');

const mockedTelemetry = createTelemetryServiceMock();
const mockStorage = jest.fn();
const mockUiSettingsGet = jest.fn();
let mockServerless: unknown;
jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
        storage: { get: mockStorage },
        uiSettings: {
          get: mockUiSettingsGet,
        },
        serverless: mockServerless,
      },
    }),
  };
});

jest.mock('../hooks/use_prevalence');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

const NO_DATA_MESSAGE = 'No prevalence data available.';
const UPSELL_MESSAGE = 'Host and user prevalence are only available with a';

const SCOPE_ID = 'scopeId';
const mockHit = buildDataTableRecord({
  _id: 'event-id',
  _index: 'indexName',
} as EsHitRecord);

const mockPrevalenceReturnValue = {
  loading: false,
  error: false,
  data: [
    {
      field: 'field1',
      values: ['value1'],
      alertCount: 1,
      docCount: 1,
      hostPrevalence: 0.05,
      userPrevalence: 0.1,
    },
    {
      field: 'field2',
      values: ['value2'],
      alertCount: 1,
      docCount: 1,
      hostPrevalence: 0.5,
      userPrevalence: 0.05,
    },
    {
      field: 'host.name',
      values: ['test host'],
      alertCount: 1,
      docCount: 1,
      hostPrevalence: 0.05,
      userPrevalence: 0.1,
    },
    {
      field: 'user.name',
      values: ['test user'],
      alertCount: 1,
      docCount: 1,
      hostPrevalence: 0.05,
      userPrevalence: 0.1,
    },
  ],
};

const renderCellActions: CellActionRenderer = ({ children }) => <>{children}</>;

const renderPrevalenceDetailsView = ({
  hit = mockHit,
  isTimelineEnabled = true,
}: {
  hit?: typeof mockHit;
  isTimelineEnabled?: boolean;
} = {}) => {
  const columns = getColumns(renderCellActions, isTimelineEnabled, SCOPE_ID);
  return render(
    <TestProviders>
      <PrevalenceDetailsView
        hit={hit}
        investigationFields={[]}
        scopeId={SCOPE_ID}
        columns={columns}
      />
    </TestProviders>
  );
};

describe('PrevalenceDetailsView', () => {
  const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetColdFrozenTierCalloutDismissedStateForTests();
    mockServerless = undefined;
    mockUiSettingsGet.mockReturnValue(true);
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
    (useUserPrivileges as jest.Mock).mockReturnValue({ timelinePrivileges: { read: true } });
    (usePrevalence as jest.Mock).mockReturnValue(mockPrevalenceReturnValue);
  });

  it('renders the date picker', () => {
    const { getByTestId } = renderPrevalenceDetailsView();

    expect(getByTestId(PREVALENCE_DETAILS_DATE_PICKER_TEST_ID)).toBeInTheDocument();
  });

  it('renders the table with all data when license is platinum', () => {
    const { getByTestId, getAllByTestId, queryByTestId, queryByText } =
      renderPrevalenceDetailsView();

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID).length).toBeGreaterThan(1);
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID).length).toBeGreaterThan(1);
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID).length).toBeGreaterThan(
      1
    );
    expect(
      getAllByTestId(PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID).length
    ).toBeGreaterThan(1);
    expect(
      getAllByTestId(PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID).length
    ).toBeGreaterThan(1);
    expect(queryByTestId(PREVALENCE_DETAILS_UPSELL_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('renders the upsell callout and hides prevalence data when license is not platinum', () => {
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: 'field1',
          values: ['value1'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
      ],
    });

    const { getByTestId, getAllByTestId } = renderPrevalenceDetailsView();

    expect(getByTestId(PREVALENCE_DETAILS_UPSELL_TEST_ID)).toHaveTextContent(UPSELL_MESSAGE);
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID).length).toEqual(2);
    expect(
      getByTestId(PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID)
    ).not.toHaveTextContent('5%');
    expect(
      getByTestId(PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID)
    ).not.toHaveTextContent('10%');
  });

  it('does not render upsell callout when there is an error', () => {
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    (usePrevalence as jest.Mock).mockReturnValue({ loading: false, error: true, data: [] });

    const { queryByTestId } = renderPrevalenceDetailsView();

    expect(queryByTestId(PREVALENCE_DETAILS_UPSELL_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders formatted numbers in alert and document count columns as clickable buttons', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: 'field1',
          values: ['value1'],
          alertCount: 1000,
          docCount: 2000000,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
      ],
    });

    const { getByTestId, getAllByTestId } = renderPrevalenceDetailsView();

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID)).toHaveTextContent('field1');
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID)).toHaveTextContent('value1');
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID)).toHaveTextContent('1k');
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID)).toHaveTextContent('2M');
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID)).toHaveTextContent(
      '5%'
    );
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID)).toHaveTextContent(
      '10%'
    );
    expect(
      getAllByTestId(PREVALENCE_DETAILS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID).length
    ).toBeGreaterThan(1);
  });

  it('renders count columns as plain text when timeline interactions are disabled', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: 'field1',
          values: ['value1'],
          alertCount: 1000,
          docCount: 2000000,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
      ],
    });

    const { getAllByTestId, queryAllByTestId } = renderPrevalenceDetailsView({
      isTimelineEnabled: false,
    });

    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_COUNT_TEXT_BUTTON_TEST_ID).length).toBe(2);
    expect(
      queryAllByTestId(PREVALENCE_DETAILS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID).length
    ).toBe(0);
  });

  it('renders count columns as plain text when user lacks timeline read privileges', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({ timelinePrivileges: { read: false } });
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: 'field1',
          values: ['value1'],
          alertCount: 1000,
          docCount: 2000000,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
      ],
    });

    const { queryAllByTestId } = renderPrevalenceDetailsView();

    expect(
      queryAllByTestId(PREVALENCE_DETAILS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID).length
    ).not.toBeGreaterThan(1);
  });

  it('renders no data message when the fetch errors out', () => {
    (usePrevalence as jest.Mock).mockReturnValue({ loading: false, error: true, data: [] });

    const { getByText } = renderPrevalenceDetailsView();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('renders no data message when data is empty', () => {
    (usePrevalence as jest.Mock).mockReturnValue({ loading: false, error: false, data: [] });

    const { getByText } = renderPrevalenceDetailsView();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('renders cold/frozen tier callout with excluded state text when ui setting is enabled', () => {
    const { getByTestId } = renderPrevalenceDetailsView();

    expect(getByTestId(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).toHaveTextContent(
      'Some data excluded'
    );
    expect(getByTestId(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).toHaveTextContent(
      'Cold and frozen tiers are excluded to improve performance.'
    );
  });

  it('renders cold/frozen tier callout with performance optimization text when ui setting is disabled', () => {
    mockUiSettingsGet.mockReturnValue(false);

    const { getByTestId } = renderPrevalenceDetailsView();

    expect(getByTestId(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).toHaveTextContent(
      'Performance optimization'
    );
    expect(getByTestId(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID)).toHaveTextContent(
      'This view loads more slowly because cold and frozen tiers are included.'
    );
  });

  it('does not render cold/frozen tier callout in serverless', () => {
    mockServerless = {};

    const { queryByTestId } = renderPrevalenceDetailsView();

    expect(
      queryByTestId(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('keeps callout hidden in the same tab session after dismissing', () => {
    const { getByTestId, queryByTestId, unmount } = renderPrevalenceDetailsView();

    fireEvent.click(
      getByTestId(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID)
    );
    expect(
      queryByTestId(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID)
    ).not.toBeInTheDocument();

    unmount();

    const anotherHit = buildDataTableRecord({
      _id: 'event-id-2',
      _index: 'indexName',
    } as EsHitRecord);

    const { queryByTestId: queryByTestIdAfterReopening } = renderPrevalenceDetailsView({
      hit: anotherHit,
    });

    expect(
      queryByTestIdAfterReopening(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('shows callout again after tab session reset', () => {
    const { getByTestId, queryByTestId } = renderPrevalenceDetailsView();

    fireEvent.click(
      getByTestId(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID)
    );
    expect(
      queryByTestId(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID)
    ).not.toBeInTheDocument();

    resetColdFrozenTierCalloutDismissedStateForTests();
    const { getByTestId: getByTestIdAfterReset } = renderPrevalenceDetailsView();

    expect(
      getByTestIdAfterReset(PREVALENCE_DETAILS_COLD_FROZEN_TIER_CALLOUT_TEST_ID)
    ).toBeInTheDocument();
  });

  it('uses default interval values to fetch prevalence data', () => {
    renderPrevalenceDetailsView();

    expect(usePrevalence).toHaveBeenCalledWith(
      expect.objectContaining({
        interval: { from: 'now-30d', to: 'now' },
      })
    );
  });

  it('uses values from local storage to fetch prevalence data', () => {
    mockStorage.mockReturnValue({ start: 'now-7d', end: 'now-3d' });

    renderPrevalenceDetailsView();

    expect(usePrevalence).toHaveBeenCalledWith(
      expect.objectContaining({
        interval: { from: 'now-7d', to: 'now-3d' },
      })
    );
  });
});
