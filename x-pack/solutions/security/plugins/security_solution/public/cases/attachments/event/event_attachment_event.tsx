/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import * as i18n from './translations';

interface SingleEventProps {
  actionId: string;
}

interface MultipleEventsProps extends SingleEventProps {
  totalEvents: number;
}

const MultipleEventsCommentEventComponent: React.FC<MultipleEventsProps> = ({
  actionId,
  totalEvents,
}) => {
  return (
    <span data-test-subj={`multiple-events-user-action-${actionId}`}>
      {i18n.MULTIPLE_EVENTS_COMMENT_LABEL_TITLE(totalEvents)}
    </span>
  );
};

MultipleEventsCommentEventComponent.displayName = 'MultipleEventsCommentEvent';
export const MultipleEventsCommentEvent = memo(MultipleEventsCommentEventComponent);

const SingleEventCommentEventComponent: React.FC<SingleEventProps> = ({ actionId }) => {
  return (
    <span data-test-subj={`single-event-user-action-${actionId}`}>
      {i18n.EVENT_COMMENT_LABEL_TITLE}
    </span>
  );
};

SingleEventCommentEventComponent.displayName = 'SingleEventCommentEvent';

export const SingleEventCommentEvent = memo(SingleEventCommentEventComponent);
