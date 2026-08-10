/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AlertRowActionMenu } from './alert_row_action_menu';

const createItem = (name: string): EuiContextMenuPanelItemDescriptor => ({
  key: name,
  name,
});

describe('AlertRowActionMenu', () => {
  it('orders alert action groups consistently', () => {
    render(
      <AlertRowActionMenu
        addToCaseItems={[createItem('Add to case')]}
        addToChatItems={[createItem('Add to chat')]}
        alertAssigneeItems={[createItem('Assign alert')]}
        alertTagItems={[createItem('Apply alert tags')]}
        canCreateEndpointEventFilters={false}
        eventFilterItems={[]}
        exceptionItems={[createItem('Add endpoint exception')]}
        hasAgent
        isAlert
        osqueryItems={[createItem('Run Osquery')]}
        panels={[]}
        runAlertWorkflowItems={[createItem('Run workflow')]}
        runDocumentWorkflowItems={[]}
        statusItems={[createItem('Mark as open')]}
      />
    );

    expect(screen.getAllByRole('menuitem').map(({ textContent }) => textContent)).toEqual([
      'Mark as open',
      'Assign alert',
      'Add to case',
      'Apply alert tags',
      'Add endpoint exception',
      'Run workflow',
      'Run Osquery',
      'Add to chat',
    ]);
    expect(screen.getAllByTestId('securityActionMenuGroupSeparator')).toHaveLength(4);
  });
});
