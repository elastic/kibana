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
  it('injects icons for known action keys even when the items carry no icon', async () => {
    const onAddToCase = jest.fn();

    render(
      <EventsTableBulkActionMenu
        items={[
          // No icon supplied — component must supply 'timeline'
          {
            key: 'add-bulk-to-timeline',
            name: 'Add to timeline',
            'data-test-subj': 'add-to-timeline',
          },
          // No icon supplied — component must supply 'workflow'
          {
            key: 'run-document-workflow-action',
            name: 'Run workflow',
            'data-test-subj': 'run-document-workflow-action',
          },
          // No icon supplied — component must supply 'briefcase'
          {
            key: 'attach-case',
            name: 'Add to case',
            'data-test-subj': 'attach-case',
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

  it('decorates alert-status items with colored dot icons', () => {
    render(
      <EventsTableBulkActionMenu
        items={[
          { key: 'open', name: 'Mark as open', 'data-test-subj': 'open-alert-status' },
          {
            key: 'acknowledge',
            name: 'Mark as acknowledged',
            'data-test-subj': 'acknowledged-alert-status',
          },
          {
            key: 'close-alert-with-reason',
            name: 'Close',
            'data-test-subj': 'alert-close-context-menu-item',
          },
        ]}
        panels={[]}
      />
    );

    // Status items get dot icons
    expect(
      screen.getByTestId('open-alert-status').querySelector('[data-euiicon-type="dot"]')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('acknowledged-alert-status').querySelector('[data-euiicon-type="dot"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId('alert-close-context-menu-item')
        .querySelector('[data-euiicon-type="dot"]')
    ).toBeInTheDocument();

    // Dot icons are not overwritten by withActionIcons (no entry in ACTION_ICONS_BY_ID)
    expect(
      screen.getByTestId('open-alert-status').querySelector('[data-euiicon-type="briefcase"]')
    ).not.toBeInTheDocument();
  });

  it('leaves an item with an unknown key icon-free', () => {
    render(
      <EventsTableBulkActionMenu
        items={[
          {
            key: 'some-custom-action',
            name: 'Custom',
            'data-test-subj': 'custom-action',
          },
        ]}
        panels={[]}
      />
    );

    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    // No icon element should be present
    expect(
      screen.getByTestId('custom-action').querySelector('[data-euiicon-type]')
    ).not.toBeInTheDocument();
  });
});
