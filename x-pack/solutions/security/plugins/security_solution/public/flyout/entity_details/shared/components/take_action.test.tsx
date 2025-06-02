/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { of } from 'rxjs';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { TakeAction } from './take_action';
import { TimelineModal } from '../../../../timelines/components/modal';
import { getTimelineTemplate } from '../../../../timelines/containers/api';
import { TimelineId } from '../../../../../common/types/timeline';
import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders, mockGlobalState } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
// import { timelineSelectors } from '../../../../timelines/store';
// import { sourcererSelectors } from '../../../../sourcerer/store';
// import { inputsSelectors } from '../../../../common/store';

// // Mock the entire api module
// jest.mock('../../../../timelines/containers/api', () => ({
//   getTimelineTemplate: jest.fn(),
// }));

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../timelines/containers/api');
jest.mock('../../../../common/lib/apm/use_start_transaction');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/components/user_privileges');

jest.mock('../../../../timelines/components/timeline', () => ({
  StatefulTimeline: () => <div data-test-subj="StatefulTimelineMock" />,
}));

const mockIsFullScreen = jest.fn(() => false);

jest.mock('../../../../common/store/selectors', () => ({
  inputsSelectors: { timelineFullScreenSelector: () => mockIsFullScreen() },
}));

const mockRef = {
  current: null,
};

const Wrapper = () => {
  return (
    <TestProviders>
      <TimelineModal timelineId={TimelineId.test} visible={true} openToggleRef={mockRef} />
    </TestProviders>
  );
};

const TAKE_ACTION_BTN_TEST_SUBJ = 'take-action-button';
const INVESTIGATE_IN_TIMELINE_TEST_SUBJ = 'investigate-in-timeline-take-action-button';
const TIMELINE_MODAL_TEST_SUBJ = 'timeline-portal-overlay-mask';
const TIMELINE_QUERY_INPUT_TEST_SUBJ = 'timelineQueryInput';

describe('TakeAction', () => {
  it('opens menu with "Investigate in Timeline" option upon clicking button', async () => {
    const { getByTestId } = render(<TakeAction kqlQuery={''} />, {
      wrapper: TestProviders,
    });

    const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
    expect(takeActionButton).toBeInTheDocument();

    await userEvent.click(takeActionButton.firstChild as Element);

    const investigateOption = getByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ);
    expect(investigateOption).toBeInTheDocument();
    expect(investigateOption).toBeVisible();
  });

  it('does not open menu when button is disabled', async () => {
    const { getByTestId, queryByTestId } = render(<TakeAction isDisabled={true} kqlQuery={''} />, {
      wrapper: TestProviders,
    });

    const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
    expect(takeActionButton).toBeInTheDocument();

    await userEvent.click(takeActionButton.firstChild as Element);

    expect(queryByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('opens Timeline modal with host parameters', async () => {
    const expectedQuery = 'host.name: "test-host"';
    const { getByTestId, queryByTestId } = render(<TakeAction kqlQuery={expectedQuery} />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).not.toBeInTheDocument();

    const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
    await userEvent.click(takeActionButton.firstChild as Element);

    const investigateOption = getByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ);
    await userEvent.click(investigateOption);

    expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).toBeInTheDocument();
  });

  xit('opens Timeline modal with user parameters', async () => {
    const expectedQuery = 'user.name: "test-user"';
    const { getByTestId, queryByTestId, getByRole } = render(
      <>
        <TakeAction kqlQuery={expectedQuery} />
        <TimelineModal timelineId={TimelineId.test} visible={true} openToggleRef={mockRef} />
      </>,
      {
        wrapper: TestProviders,
      }
    );

    // expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).not.toBeInTheDocument();
    // expect(getByTestId('StatefulTimelineMock')).not.toBeInTheDocument();

    const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
    await userEvent.click(takeActionButton.firstChild as Element);

    // await waitFor(() => {
    //   // const timelineModal = getByTestId('timeline-portal-ref');
    //   // expect(timelineModal).toBeInTheDocument();
    //   expect(getByTestId('StatefulTimelineMock')).toBeInTheDocument();
    // });

    // const investigateOption = getByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ);
    // await userEvent.click(investigateOption.querySelector('button') as Element);
    const button = getByRole('button', { name: /Investigate in Timeline/i });
    await userEvent.click(button);

    expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).toBeInTheDocument();
  });

  // it.only('opens Timeline modal when clicking TakeAction component', async () => {
  //   const expectedQuery = 'user.name: "test-user"';
  //   const { getByTestId, queryByTestId, getByRole } = render(
  //     <TakeAction kqlQuery={expectedQuery} />,
  //     {
  //       wrapper: TestProviders,
  //     }
  //   );

  //   // Verify TimelineModal is initially hidden
  //   expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).not.toBeInTheDocument();

  //   // Click the TakeAction button
  //   const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
  //   await userEvent.click(takeActionButton.firstChild as Element);

  //   // Wait for and click the "Investigate in Timeline" button
  //   const investigateButton = getByRole('button', { name: /Investigate in Timeline/i });
  //   await userEvent.click(investigateButton);

  //   // Verify TimelineModal appears
  //   await waitFor(() => {
  //     const timelineModal = getByTestId(TIMELINE_MODAL_TEST_SUBJ);
  //     expect(timelineModal).toBeInTheDocument();
  //     expect(timelineModal).toBeVisible();
  //   });

  //   // Verify the modal has the correct timeline ID
  //   const timelineProps = getByTestId(TIMELINE_MODAL_TEST_SUBJ);
  //   expect(timelineProps).toHaveAttribute('data-timeline-id', TEST_TIMELINE_ID);
  // });

  xit('opens Timeline modal with generic parameters', () => {
    const expectedQuery = 'entity.id: "test-id" OR related.entity: "test-related-id';
    const { getByTestId } = render(<TakeAction kqlQuery={expectedQuery} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId(TIMELINE_MODAL_TEST_SUBJ)).not.toBeInTheDocument();

    getByTestId(TAKE_ACTION_BTN_TEST_SUBJ).click();
    getByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ).click();

    expect(getByTestId(TIMELINE_MODAL_TEST_SUBJ)).toBeInTheDocument();

    const startDateButton = getByTestId('superDatePickerstartDatePopoverButton');
    const endDateButton = getByTestId('superDatePickerendDatePopoverButton');

    const expectedStartTimestamp = '2025-05-30T14:16:51.000Z'; // ISO format timestamp
    const expectedEndTimestamp = '2025-05-30T14:46:51.000Z'; // ISO format timestamp, 30 mins later than start timestamp
    expect(startDateButton).toHaveTextContent(expectedStartTimestamp);
    expect(endDateButton).toHaveTextContent(expectedEndTimestamp);
    expect(getByTestId(TIMELINE_QUERY_INPUT_TEST_SUBJ)).toHaveTextContent(expectedQuery);
  });
});

const nonECSRowData: TimelineEventsDetailsItem[] = [
  {
    category: 'agent',
    isObjectArray: false,
    field: 'agent.type',
    values: ['blah'],
  },
  {
    category: 'kibana',
    isObjectArray: false,
    field: 'kibana.alert.workflow_status',
    values: ['open'],
  },
  {
    category: 'kibana',
    isObjectArray: false,
    field: 'kibana.alert.rule.uuid',
    values: ['testId'],
  },
  {
    category: 'host',
    isObjectArray: false,
    field: 'host.name',
    values: ['some host name'],
  },
];

const getNonEcsDataWithRuleTypeAndTimelineTemplate = (
  ruleType: string,
  nonEcsData: TimelineEventsDetailsItem[] = nonECSRowData
) => {
  return [
    ...nonEcsData,
    {
      category: 'kibana',
      isObjectArray: false,
      field: 'kibana.alert.rule.type',
      values: [ruleType],
    },
    {
      category: 'kibana',
      isObjectArray: false,
      field: 'kibana.alert.rule.timeline_id',
      values: ['dummyTimelineTemplateId'],
    },
  ];
};

const mockTimelineTemplateResponse = {
  savedObjectId: '15bc8185-06ef-4956-b7e7-be8e289b13c2',
  version: 'WzIzMzUsMl0=',
  columns: [
    {
      columnHeaderType: 'not-filtered',
      id: '@timestamp',
      type: 'date',
    },
    {
      columnHeaderType: 'not-filtered',
      id: 'host.name',
    },
    {
      columnHeaderType: 'not-filtered',
      id: 'user.name',
    },
  ],
  dataProviders: [
    {
      and: [],
      enabled: true,
      id: 'some-random-id',
      name: 'host.name',
      excluded: false,
      kqlQuery: '',
      queryMatch: {
        field: 'host.name',
        value: '{host.name}',
        operator: ':',
      },
      type: 'template',
    },
  ],
  dataViewId: 'security-solution-default',
  description: '',
  eqlOptions: {
    eventCategoryField: 'event.category',
    tiebreakerField: '',
    timestampField: '@timestamp',
    query: '',
    size: 100,
  },
  eventType: 'all',
  excludedRowRendererIds: [
    'alert',
    'alerts',
    'auditd',
    'auditd_file',
    'library',
    'netflow',
    'plain',
    'registry',
    'suricata',
    'system',
    'system_dns',
    'system_endgame_process',
    'system_file',
    'system_fim',
    'system_security_event',
    'system_socket',
    'threat_match',
    'zeek',
  ],
  favorite: [],
  filters: [],
  indexNames: ['.alerts-security.alerts-default', 'auditbeat-*', 'filebeat-*', 'packetbeat-*'],
  kqlMode: 'filter',
  kqlQuery: {
    filterQuery: {
      kuery: {
        kind: 'kuery',
        expression: '*',
      },
      serializedQuery: '{"query_string":{"query":"*"}}',
    },
  },
  title: 'Named Template',
  templateTimelineId: 'c755cda6-8a65-4ec2-b6ff-35a5356de8b9',
  templateTimelineVersion: 1,
  dateRange: {
    start: '2024-08-13T22:00:00.000Z',
    end: '2024-08-14T21:59:59.999Z',
  },
  savedQueryId: null,
  created: 1723625359467,
  createdBy: 'elastic',
  updated: 1723625359988,
  updatedBy: 'elastic',
  timelineType: 'template',
  status: 'active',
  sort: [
    {
      columnId: '@timestamp',
      columnType: 'date',
      sortDirection: 'desc',
      esTypes: ['date'],
    },
  ],
  savedSearchId: null,
  eventIdToNoteIds: [],
  noteIds: [],
  notes: [],
  pinnedEventIds: [],
  pinnedEventsSaveObject: [],
};

describe('useInvestigateInTimeline', () => {
  const mockSearchStrategyClient = {
    search: jest
      .fn()
      .mockReturnValue(of({ data: getNonEcsDataWithRuleTypeAndTimelineTemplate('query') })),
  };

  beforeEach(() => {
    // Mock Redux selectors
    // jest.mock('../../../../timelines/store', () => ({
    //   timelineSelectors: {
    //     getTimelineByIdSelector: jest.fn().mockImplementation(() => ({
    //       id: TimelineId.test,
    //       title: 'Test Timeline',
    //       columns: [],
    //       dataViewId: mockGlobalState.sourcerer.defaultDataView,
    //     })),
    //   },
    // }));

    jest.mock('../../../../sourcerer/store', () => ({
      sourcererSelectors: {
        defaultDataView: jest.fn().mockImplementation(() => ({
          id: mockGlobalState.sourcerer.defaultDataView,
          patternList: [],
        })),
      },
    }));

    // jest.mock('../../../../common/store', () => ({
    //   inputsSelectors: {
    //     globalTimeRange: jest.fn().mockImplementation(() => ({
    //       from: mockGlobalState.inputs.global.query.from,
    //       to: mockGlobalState.inputs.global.query.to,
    //     })),
    //   },
    // }));

    (getTimelineTemplate as jest.Mock).mockImplementation(() =>
      Promise.resolve(mockTimelineTemplateResponse)
    );
    // by default we return data for query rule type
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          search: mockSearchStrategyClient,
          query: jest.fn(),
        },
        signalIndexName: mockGlobalState.sourcerer.signalIndexName,
      },
    });
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: true },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.only('opens Timeline modal with user parameters', async () => {
    const expectedQuery = 'user.name: "test-user"';
    const { getByTestId, queryByTestId, getByRole } = render(
      <>
        <TakeAction kqlQuery={expectedQuery} />
        <TimelineModal timelineId={TimelineId.test} visible={true} openToggleRef={mockRef} />
      </>,
      {
        wrapper: TestProviders,
      }
    );

    // expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).not.toBeInTheDocument();
    // expect(getByTestId('StatefulTimelineMock')).not.toBeInTheDocument();

    const takeActionButton = getByTestId(TAKE_ACTION_BTN_TEST_SUBJ);
    await userEvent.click(takeActionButton.firstChild as Element);

    // await waitFor(() => {
    //   // const timelineModal = getByTestId('timeline-portal-ref');
    //   // expect(timelineModal).toBeInTheDocument();
    //   expect(getByTestId('StatefulTimelineMock')).toBeInTheDocument();
    // });

    // const investigateOption = getByTestId(INVESTIGATE_IN_TIMELINE_TEST_SUBJ);
    // await userEvent.click(investigateOption.querySelector('button') as Element);
    const button = getByRole('button', { name: /Investigate in Timeline/i });
    await userEvent.click(button);

    expect(queryByTestId(TIMELINE_MODAL_TEST_SUBJ)).toBeInTheDocument();
  });
});
