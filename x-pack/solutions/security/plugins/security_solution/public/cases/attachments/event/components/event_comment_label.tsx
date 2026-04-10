/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EVENT_COMMENT_LABEL_TITLE, MULTIPLE_EVENTS_COMMENT_LABEL_TITLE } from '../translations';

export interface SingleEventCommentLabelProps {
  actionId: string;
}

export interface MultipleEventsCommentLabelProps extends SingleEventCommentLabelProps {
  totalEvents: number;
}

const SingleEventCommentLabelComponent: React.FC<SingleEventCommentLabelProps> = ({ actionId }) => (
  <span data-test-subj={`single-event-user-action-${actionId}`}>{EVENT_COMMENT_LABEL_TITLE}</span>
);

SingleEventCommentLabelComponent.displayName = 'SingleEventCommentLabel';

export const SingleEventCommentLabel = memo(SingleEventCommentLabelComponent);

const MultipleEventsCommentLabelComponent: React.FC<MultipleEventsCommentLabelProps> = ({
  actionId,
  totalEvents,
}) => (
  <span data-test-subj={`multiple-events-user-action-${actionId}`}>
    {MULTIPLE_EVENTS_COMMENT_LABEL_TITLE(totalEvents)}
  </span>
);

MultipleEventsCommentLabelComponent.displayName = 'MultipleEventsCommentLabel';

export const MultipleEventsCommentLabel = memo(MultipleEventsCommentLabelComponent);
