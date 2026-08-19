/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';

import { getEventType } from '.';
import { EVENT_COMMENT_LABEL_TITLE, MULTIPLE_EVENTS_COMMENT_LABEL_TITLE } from './translations';

const baseProps = {
  savedObjectId: 'saved-object-id-1',
  metadata: { index: '.alerts-security.alerts-default' },
} as unknown as UnifiedReferenceAttachmentViewProps;

describe('Event attachment label rendering', () => {
  it('renders single-event label with the expected test-subj', () => {
    const attachmentType = getEventType();
    const attachmentViewObject = attachmentType.getAttachmentViewObject({
      ...baseProps,
      attachmentId: 'event-id-1',
    });

    render(<>{attachmentViewObject.event}</>);

    expect(screen.getByTestId('event-user-action-saved-object-id-1')).toHaveTextContent(
      EVENT_COMMENT_LABEL_TITLE
    );
  });

  it('renders multiple-event label with the expected test-subj', () => {
    const attachmentType = getEventType();
    const attachmentViewObject = attachmentType.getAttachmentViewObject({
      ...baseProps,
      attachmentId: ['event-id-1', 'event-id-2'],
    });

    render(<>{attachmentViewObject.event}</>);

    expect(screen.getByTestId('event-user-action-saved-object-id-1')).toHaveTextContent(
      MULTIPLE_EVENTS_COMMENT_LABEL_TITLE(2)
    );
  });
});
