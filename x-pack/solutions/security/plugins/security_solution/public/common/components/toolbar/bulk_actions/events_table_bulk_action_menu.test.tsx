/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventsTableBulkActionMenu } from './events_table_bulk_action_menu';

describe('EventsTableBulkActionMenu', () => {
  it('groups new and existing case actions in a case type panel', async () => {
    const onAddToNewCase = jest.fn();
    const onAddToExistingCase = jest.fn();

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
            key: 'attach-new-case',
            name: 'Add to new case',
            'data-test-subj': 'attach-new-case',
            onActionClick: onAddToNewCase,
          },
          {
            key: 'attach-existing-case',
            name: 'Add to existing case',
            'data-test-subj': 'attach-existing-case',
            onActionClick: onAddToExistingCase,
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
    expect(screen.getByTestId('add-to-case')).toBeInTheDocument();
    expect(screen.queryByTestId('attach-new-case')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attach-existing-case')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('add-to-case'));

    expect(await screen.findByText('Case type')).toBeInTheDocument();
    expect(screen.queryByTestId('add-to-case-submit')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByTestId('attach-existing-case'));

    expect(onAddToExistingCase).toHaveBeenCalledTimes(1);
    expect(onAddToNewCase).not.toHaveBeenCalled();
  });

  it('leaves an individual case action in the initial panel', () => {
    render(
      <EventsTableBulkActionMenu
        items={[
          {
            key: 'attach-new-case',
            name: 'Add to new case',
            'data-test-subj': 'attach-new-case',
          },
        ]}
        panels={[]}
      />
    );

    expect(screen.getByTestId('attach-new-case')).toBeInTheDocument();
    expect(screen.queryByTestId('add-to-case')).not.toBeInTheDocument();
  });
});
