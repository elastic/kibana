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
import { OSQUERY_ACTION_ID } from '../../../osquery/osquery_action_item';
import { ADD_TO_CASE_ACTION_IDS } from '../use_add_to_case_actions';
import { ADD_TO_CHAT_ACTION_ID } from '../use_add_to_chat_action';
import { ALERT_EXCEPTION_ACTION_IDS } from '../use_add_exception_actions';
import { RUN_ALERT_WORKFLOW_ACTION_ID } from '../use_run_alert_workflow_panel';
import { ALERT_TAG_ACTION_ID } from '../../../../../common/components/toolbar/bulk_actions/use_bulk_alert_tags_items';
import { ALERT_ASSIGNEE_ACTION_IDS } from '../../../../../common/components/toolbar/bulk_actions/use_bulk_alert_assignees_items';
import { ALERT_STATUS_ACTION_IDS } from '../../../../../common/components/toolbar/bulk_actions/use_bulk_action_items';

const createItem = (key: string, name: string): EuiContextMenuPanelItemDescriptor => ({
  key,
  name,
  'data-test-subj': key,
});

describe('AlertRowActionMenu', () => {
  it('orders alert action groups consistently', () => {
    render(
      <AlertRowActionMenu
        addToCaseItems={[createItem(ADD_TO_CASE_ACTION_IDS.addToCase, 'Add to case')]}
        addToChatItems={[createItem(ADD_TO_CHAT_ACTION_ID, 'Add to chat')]}
        alertAssigneeItems={[createItem(ALERT_ASSIGNEE_ACTION_IDS.assign, 'Assign alert')]}
        alertTagItems={[createItem(ALERT_TAG_ACTION_ID, 'Apply alert tags')]}
        canCreateEndpointEventFilters={false}
        eventFilterItems={[]}
        exceptionItems={[
          createItem(ALERT_EXCEPTION_ACTION_IDS.addEndpointException, 'Add endpoint exception'),
        ]}
        hasAgent
        isAlert
        osqueryItems={[createItem(OSQUERY_ACTION_ID, 'Run Osquery')]}
        panels={[]}
        runAlertWorkflowItems={[createItem(RUN_ALERT_WORKFLOW_ACTION_ID, 'Run workflow')]}
        runDocumentWorkflowItems={[]}
        statusItems={[createItem(ALERT_STATUS_ACTION_IDS.markAsOpen, 'Mark as open')]}
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

  it('decorates action items with icons from ACTION_ICONS_BY_ID', () => {
    render(
      <AlertRowActionMenu
        addToCaseItems={[createItem(ADD_TO_CASE_ACTION_IDS.addToCase, 'Add to case')]}
        addToChatItems={[]}
        alertAssigneeItems={[createItem(ALERT_ASSIGNEE_ACTION_IDS.assign, 'Assign alert')]}
        alertTagItems={[createItem(ALERT_TAG_ACTION_ID, 'Apply alert tags')]}
        canCreateEndpointEventFilters={false}
        eventFilterItems={[]}
        exceptionItems={[]}
        hasAgent
        isAlert
        osqueryItems={[createItem(OSQUERY_ACTION_ID, 'Run Osquery')]}
        panels={[]}
        runAlertWorkflowItems={[createItem(RUN_ALERT_WORKFLOW_ACTION_ID, 'Run workflow')]}
        runDocumentWorkflowItems={[]}
        statusItems={[]}
      />
    );

    expect(
      screen
        .getByTestId(ADD_TO_CASE_ACTION_IDS.addToCase)
        .querySelector('[data-euiicon-type="briefcase"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId(ALERT_ASSIGNEE_ACTION_IDS.assign)
        .querySelector('[data-euiicon-type="users"]')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(ALERT_TAG_ACTION_ID).querySelector('[data-euiicon-type="tag"]')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(OSQUERY_ACTION_ID).querySelector('[data-euiicon-type="commandLine"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId(RUN_ALERT_WORKFLOW_ACTION_ID)
        .querySelector('[data-euiicon-type="workflow"]')
    ).toBeInTheDocument();
  });
});
