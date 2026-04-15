/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SingleEventCommentLabel, MultipleEventsCommentLabel } from './event_comment_label';

describe('SingleEventCommentLabel', () => {
  it('renders the single event label', () => {
    render(<SingleEventCommentLabel actionId="action-1" />);
    expect(screen.getByTestId('single-event-user-action-action-1')).toBeInTheDocument();
    expect(screen.getByText('added an event')).toBeInTheDocument();
  });
});

describe('MultipleEventsCommentLabel', () => {
  it('renders the multiple events label', () => {
    render(<MultipleEventsCommentLabel actionId="action-1" totalEvents={3} />);
    expect(screen.getByTestId('multiple-events-user-action-action-1')).toBeInTheDocument();
    expect(screen.getByText('added 3 events')).toBeInTheDocument();
  });

  it('renders singular form for one event', () => {
    render(<MultipleEventsCommentLabel actionId="action-1" totalEvents={1} />);
    expect(screen.getByText('added event')).toBeInTheDocument();
  });
});
