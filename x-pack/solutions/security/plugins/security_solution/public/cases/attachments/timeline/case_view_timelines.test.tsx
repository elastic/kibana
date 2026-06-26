/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

import { CaseViewTimelines } from './case_view_timelines';
import { useGetTimelinesByIds } from './use_get_timelines_by_ids';
import { useEditTimelineBatchActions } from '../../../timelines/components/open_timeline/edit_timeline_batch_actions';
import { TimelinesTable } from '../../../timelines/components/open_timeline/timelines_table';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(() => true),
}));

const mockedUseIsExperimentalFeatureEnabled =
  useIsExperimentalFeatureEnabled as jest.MockedFunction<typeof useIsExperimentalFeatureEnabled>;

jest.mock('./use_get_timelines_by_ids');
jest.mock('../../../timelines/components/open_timeline/helpers', () => ({
  ...jest.requireActual('../../../timelines/components/open_timeline/helpers'),
  useQueryTimelineById: () => jest.fn(),
}));

jest.mock('../../../timelines/components/open_timeline/timelines_table', () => ({
  TimelinesTable: jest.fn(() => <div data-test-subj="timelines-table" />),
}));

const mockGetBatchItemsPopoverContent = jest.fn(() => (
  <div data-test-subj="batch-popover-content" />
));

jest.mock('../../../timelines/components/open_timeline/edit_timeline_batch_actions', () => ({
  useEditTimelineBatchActions: jest.fn(() => ({
    getBatchItemsPopoverContent: mockGetBatchItemsPopoverContent,
    onCompleteBatchActions: jest.fn(),
  })),
}));

const mockedUseGetTimelinesByIds = useGetTimelinesByIds as jest.MockedFunction<
  typeof useGetTimelinesByIds
>;
const mockedTimelinesTable = TimelinesTable as unknown as jest.Mock;
const mockedUseEditTimelineBatchActions = useEditTimelineBatchActions as jest.Mock;

const buildCaseData = (comments: Array<{ type: string; attachmentId?: string | string[] }>) =>
  ({
    id: 'case-1',
    title: 'Case 1',
    comments,
  } as never);

describe('CaseViewTimelines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseGetTimelinesByIds.mockReturnValue({
      timelines: [],
      totalCount: 0,
      loading: false,
      refetch: jest.fn(),
    });
  });

  it('renders the empty prompt when no timeline attachments are present', () => {
    render(
      <TestProviders>
        <CaseViewTimelines caseData={buildCaseData([])} />
      </TestProviders>
    );

    expect(screen.getByTestId('case-view-timelines-empty')).toBeInTheDocument();
    expect(mockedUseGetTimelinesByIds).toHaveBeenCalledWith(expect.objectContaining({ ids: [] }));
  });

  it('passes savedObjectIds from timeline attachments to the hook (dedupe happens server-side)', () => {
    render(
      <TestProviders>
        <CaseViewTimelines
          caseData={buildCaseData([
            { type: SECURITY_TIMELINE_ATTACHMENT_TYPE, attachmentId: 'timeline-1' },
            { type: SECURITY_TIMELINE_ATTACHMENT_TYPE, attachmentId: 'timeline-1' },
            { type: SECURITY_TIMELINE_ATTACHMENT_TYPE, attachmentId: 'timeline-2' },
            { type: 'user', attachmentId: 'should-ignore' },
          ])}
        />
      </TestProviders>
    );

    const args = mockedUseGetTimelinesByIds.mock.calls[0][0];
    expect(args.ids).toEqual(['timeline-1', 'timeline-1', 'timeline-2']);
  });

  it('renders the timelines table when ids are present', () => {
    mockedUseGetTimelinesByIds.mockReturnValue({
      timelines: [
        {
          savedObjectId: 'timeline-1',
          title: 'Investigation A',
          description: 'desc',
          updated: 1700000000000,
          updatedBy: 'analyst',
        },
      ] as never,
      totalCount: 1,
      loading: false,
      refetch: jest.fn(),
    });

    render(
      <TestProviders>
        <CaseViewTimelines
          caseData={buildCaseData([
            { type: SECURITY_TIMELINE_ATTACHMENT_TYPE, attachmentId: 'timeline-1' },
          ])}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('case-view-timelines')).toBeInTheDocument();
    expect(screen.getByTestId('timelines-table')).toBeInTheDocument();
  });

  it('forwards the outer search term to the hook', () => {
    render(
      <TestProviders>
        <CaseViewTimelines
          caseData={buildCaseData([
            { type: SECURITY_TIMELINE_ATTACHMENT_TYPE, attachmentId: 'timeline-1' },
          ])}
          searchTerm="phishing"
        />
      </TestProviders>
    );

    const args = mockedUseGetTimelinesByIds.mock.calls[0][0];
    expect(args.search).toBe('phishing');
  });

  describe('Super Timeline — feature flag disabled', () => {
    const caseDataWithTimelines = buildCaseData([
      { type: SECURITY_TIMELINE_ATTACHMENT_TYPE, attachmentId: 'tl-1' },
      { type: SECURITY_TIMELINE_ATTACHMENT_TYPE, attachmentId: 'tl-2' },
    ]);

    beforeEach(() => {
      mockedUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    });

    afterEach(() => {
      mockedUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    });

    it('passes empty actionTimelineToShow when flag is off', () => {
      render(
        <TestProviders>
          <CaseViewTimelines caseData={caseDataWithTimelines} />
        </TestProviders>
      );

      const props = mockedTimelinesTable.mock.calls.at(-1)[0];
      expect(props.actionTimelineToShow).toEqual([]);
    });

    it('never shows the batch actions button when flag is off', () => {
      render(
        <TestProviders>
          <CaseViewTimelines caseData={caseDataWithTimelines} />
        </TestProviders>
      );

      // Simulate a selection being reported by the table mock
      const { onSelectionChange } = mockedTimelinesTable.mock.calls.at(-1)[0];
      act(() => onSelectionChange([{ savedObjectId: 'tl-1' }, { savedObjectId: 'tl-2' }]));

      expect(
        screen.queryByTestId('case-view-timelines-batch-actions-button')
      ).not.toBeInTheDocument();
    });
  });

  describe('Super Timeline — selection and batch actions', () => {
    const caseDataWithTimelines = buildCaseData([
      { type: SECURITY_TIMELINE_ATTACHMENT_TYPE, attachmentId: 'tl-1' },
      { type: SECURITY_TIMELINE_ATTACHMENT_TYPE, attachmentId: 'tl-2' },
    ]);

    it('passes selectable to actionTimelineToShow', () => {
      render(
        <TestProviders>
          <CaseViewTimelines caseData={caseDataWithTimelines} />
        </TestProviders>
      );

      const props = mockedTimelinesTable.mock.calls.at(-1)[0];
      expect(props.actionTimelineToShow).toContain('selectable');
    });

    it('wires useEditTimelineBatchActions with TimelineTypeEnum.default', () => {
      render(
        <TestProviders>
          <CaseViewTimelines caseData={caseDataWithTimelines} />
        </TestProviders>
      );

      const { timelineType } = mockedUseEditTimelineBatchActions.mock.calls.at(-1)[0];
      expect(timelineType).toBe('default');
    });

    it('shows the batch actions button in the utility bar regardless of selection', () => {
      render(
        <TestProviders>
          <CaseViewTimelines caseData={caseDataWithTimelines} />
        </TestProviders>
      );

      expect(screen.getByTestId('case-view-timelines-batch-actions-button')).toBeInTheDocument();
    });

    it('opens the popover and renders batch content on button click', async () => {
      const user = userEvent.setup();
      render(
        <TestProviders>
          <CaseViewTimelines caseData={caseDataWithTimelines} />
        </TestProviders>
      );

      const { onSelectionChange } = mockedTimelinesTable.mock.calls.at(-1)[0];
      act(() => onSelectionChange([{ savedObjectId: 'tl-1' }, { savedObjectId: 'tl-2' }]));

      // UtilityBarAction wraps the trigger in a LinkIcon; the clickable element carries
      // the "-popover" suffix data-test-subj added by the Popover sub-component.
      await user.click(screen.getByTestId('case-view-timelines-batch-actions-button-popover'));

      expect(mockGetBatchItemsPopoverContent).toHaveBeenCalled();
      expect(screen.getByTestId('batch-popover-content')).toBeInTheDocument();
    });

    it('keeps the batch actions button visible after selection is cleared', () => {
      render(
        <TestProviders>
          <CaseViewTimelines caseData={caseDataWithTimelines} />
        </TestProviders>
      );

      const { onSelectionChange } = mockedTimelinesTable.mock.calls.at(-1)[0];
      act(() => onSelectionChange([{ savedObjectId: 'tl-1' }]));
      act(() => onSelectionChange([]));

      expect(screen.getByTestId('case-view-timelines-batch-actions-button')).toBeInTheDocument();
    });
  });
});
