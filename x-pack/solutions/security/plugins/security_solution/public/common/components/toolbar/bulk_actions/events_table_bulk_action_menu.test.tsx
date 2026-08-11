/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventsTableBulkActionMenu } from './events_table_bulk_action_menu';

describe('EventsTableBulkActionMenu', () => {
  it('renders the singular case action with the other bulk actions', async () => {
    const onAddToCase = jest.fn();

    render(
      <EventsTableBulkActionMenu
        items={[
          {
            key: 'add-to-timeline',
            name: 'Add to timeline',
            'data-test-subj': 'add-to-timeline',
            icon: 'timeline',
          },
          {
            key: 'run-document-workflow-action',
            name: 'Run workflow',
            'data-test-subj': 'run-document-workflow-action',
            icon: 'workflow',
          },
          {
            key: 'attach-case',
            name: 'Add to case',
            'data-test-subj': 'attach-case',
            icon: 'briefcase',
            onClick: onAddToCase,
          },
        ]}
        panels={[]}
      />
    );

    expect(
      screen.getByTestId('add-to-timeline').querySelector('[data-euiicon-type="timeline"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId('run-document-workflow-action')
        .querySelector('[data-euiicon-type="workflow"]')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('attach-case').querySelector('[data-euiicon-type="briefcase"]')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('attach-case'));

    expect(onAddToCase).toHaveBeenCalledTimes(1);
  });

  it('leaves an individual case action in the initial panel', () => {
    render(
      <EventsTableBulkActionMenu
        items={[
          {
            key: 'attach-case',
            name: 'Add to case',
            'data-test-subj': 'attach-case',
          },
        ]}
        panels={[]}
      />
    );

    expect(screen.getByTestId('attach-case')).toBeInTheDocument();
  });
});
