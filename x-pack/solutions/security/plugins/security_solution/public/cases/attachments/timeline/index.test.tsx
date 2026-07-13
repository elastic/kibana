/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

import { getTimelineAttachment } from '.';
import { REMOVED_TIMELINE_LABEL, TIMELINE_DISPLAY_NAME } from './translations';

jest.mock('./timeline_link', () => ({
  TimelineLink: ({
    savedObjectId,
    timelineId,
    title,
  }: {
    savedObjectId: string;
    timelineId: string;
    title: string;
  }) => (
    <div data-test-subj={`timeline-link-mock-${savedObjectId}`}>{`${title}|${timelineId}`}</div>
  ),
}));

jest.mock('./case_view_timelines', () => ({
  CaseViewTimelines: () => <div data-test-subj="case-view-timelines-mock" />,
}));

const baseProps = {
  savedObjectId: 'saved-object-id-1',
  caseData: { id: 'case-1', title: 'Case 1' },
  metadata: { title: 'My investigation' },
  attachmentId: 'timeline-id-1',
} as unknown as UnifiedReferenceAttachmentViewProps;

describe('Timeline attachment', () => {
  it('registers under the security.timeline id with the timeline icon', () => {
    const attachmentType = getTimelineAttachment();
    expect(attachmentType.id).toBe(SECURITY_TIMELINE_ATTACHMENT_TYPE);
    expect(attachmentType.icon).toBe('timeline');
    expect(attachmentType.displayName).toBe(TIMELINE_DISPLAY_NAME);
  });

  it('renders the timeline link with title and id', async () => {
    const attachmentType = getTimelineAttachment();
    const attachmentViewObject = attachmentType.getAttachmentViewObject(baseProps);

    render(<>{attachmentViewObject.event}</>);

    expect(await screen.findByTestId('timeline-link-mock-saved-object-id-1')).toHaveTextContent(
      'My investigation'
    );
  });

  it('returns the removal label', () => {
    const attachmentType = getTimelineAttachment();
    expect(attachmentType.getAttachmentRemovalObject?.(baseProps)).toEqual({
      event: REMOVED_TIMELINE_LABEL,
    });
  });

  it('exposes the case view timelines tab via getAttachmentTabViewObject', async () => {
    const attachmentType = getTimelineAttachment();
    const tabViewObject = attachmentType.getAttachmentTabViewObject?.();
    expect(tabViewObject?.children).toBeDefined();

    const Tab = tabViewObject!.children!;
    render(
      <Tab
        caseData={{ id: 'case-1', title: 'Case 1', comments: [] } as never}
        searchTerm={undefined}
      />
    );

    expect(await screen.findByTestId('case-view-timelines-mock')).toBeInTheDocument();
  });
});
