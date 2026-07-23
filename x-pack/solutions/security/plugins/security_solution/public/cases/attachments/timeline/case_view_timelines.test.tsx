/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

import { CaseViewTimelines } from './case_view_timelines';
import { useGetTimelinesByIds } from './use_get_timelines_by_ids';
import { TestProviders } from '../../../common/mock';

jest.mock('./use_get_timelines_by_ids');
jest.mock('../../../timelines/components/open_timeline/helpers', () => ({
  ...jest.requireActual('../../../timelines/components/open_timeline/helpers'),
  useQueryTimelineById: () => jest.fn(),
}));

const mockedUseGetTimelinesByIds = useGetTimelinesByIds as jest.MockedFunction<
  typeof useGetTimelinesByIds
>;

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

  it('does not forward the tab search term to the hook (attachments are filtered client-side)', () => {
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
    expect(args.search).toBeUndefined();
  });
});
