/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  ATTACK_ADD_TO_CASE_ACTION_ID,
  ATTACK_AI_ACTION_IDS,
  ATTACK_ASSIGNEE_ACTION_IDS,
  ATTACK_DISCOVERY_ACTION_IDS,
  ATTACK_STATUS_ACTION_IDS,
  ATTACK_TAG_ACTION_ID,
  EXPLORE_IN_ATTACKS_ACTION_ID,
  RUN_ATTACK_WORKFLOW_ACTION_ID,
} from '../../../../common/constants/action_ids';
import { ACTION_MENU_GROUP_SEPARATOR_TEST_ID } from '../../../../common/utils/action_menu_items';
import { AttacksActionMenu } from './attacks_action_menu';

const createItem = (key: string, name: string): EuiContextMenuPanelItemDescriptor => ({
  key,
  name,
  'data-test-subj': key,
});

const defaultProps = {
  assigneeItems: [createItem(ATTACK_ASSIGNEE_ACTION_IDS.assign, 'Assign attack')],
  assigneePanels: [],
  caseItems: [createItem(ATTACK_ADD_TO_CASE_ACTION_ID, 'Add to case')],
  casePanels: [],
  datasetItems: [createItem(ATTACK_DISCOVERY_ACTION_IDS.addToDataset, 'Add to dataset')],
  isRemoteDocument: false,
  navigationItems: [createItem(EXPLORE_IN_ATTACKS_ACTION_ID, 'Explore in Attacks')],
  runWorkflowItems: [createItem(RUN_ATTACK_WORKFLOW_ACTION_ID, 'Run workflow')],
  runWorkflowPanels: [],
  showAiAssistantAction: true,
  statusItems: [createItem(ATTACK_STATUS_ACTION_IDS.markAsOpen, 'Mark as open')],
  statusPanels: [],
  tagItems: [createItem(ATTACK_TAG_ACTION_ID, 'Apply tags')],
  tagPanels: [],
  viewInAiAssistantItems: [
    createItem(ATTACK_AI_ACTION_IDS.viewInAiAssistant, 'View in AI Assistant'),
  ],
};

describe('AttacksActionMenu', () => {
  it('orders attack action groups and decorates them with icons', () => {
    render(<AttacksActionMenu {...defaultProps} />);

    expect(screen.getAllByRole('menuitem').map(({ textContent }) => textContent)).toEqual([
      'Mark as open',
      'Assign attack',
      'Add to case',
      'Apply tags',
      'Run workflow',
      'View in AI Assistant',
      'Add to dataset',
      'Explore in Attacks',
    ]);
    expect(screen.getAllByTestId(ACTION_MENU_GROUP_SEPARATOR_TEST_ID)).toHaveLength(5);
    expect(
      screen
        .getByTestId(ATTACK_STATUS_ACTION_IDS.markAsOpen)
        .querySelector('[data-euiicon-type="dot"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId(ATTACK_ASSIGNEE_ACTION_IDS.assign)
        .querySelector('[data-euiicon-type="users"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId(ATTACK_ADD_TO_CASE_ACTION_ID)
        .querySelector('[data-euiicon-type="briefcase"]')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(ATTACK_TAG_ACTION_ID).querySelector('[data-euiicon-type="tag"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId(RUN_ATTACK_WORKFLOW_ACTION_ID)
        .querySelector('[data-euiicon-type="workflow"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId(ATTACK_AI_ACTION_IDS.viewInAiAssistant)
        .querySelector('[data-euiicon-type="sparkles"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId(ATTACK_DISCOVERY_ACTION_IDS.addToDataset)
        .querySelector('[data-euiicon-type="database"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId(EXPLORE_IN_ATTACKS_ACTION_ID)
        .querySelectorAll('[data-euiicon-type="external"]')
    ).toHaveLength(1);
  });

  it('omits empty groups and the AI group when the assistant action is hidden', () => {
    render(
      <AttacksActionMenu
        {...defaultProps}
        assigneeItems={[]}
        datasetItems={[]}
        runWorkflowItems={[]}
        showAiAssistantAction={false}
        tagItems={[]}
      />
    );

    expect(screen.getAllByRole('menuitem').map(({ textContent }) => textContent)).toEqual([
      'Mark as open',
      'Add to case',
      'Explore in Attacks',
    ]);
    expect(screen.getAllByTestId(ACTION_MENU_GROUP_SEPARATOR_TEST_ID)).toHaveLength(2);
    expect(screen.queryByTestId(ATTACK_AI_ACTION_IDS.viewInAiAssistant)).not.toBeInTheDocument();
  });

  it('renders only navigation actions for remote attacks', () => {
    render(<AttacksActionMenu {...defaultProps} isRemoteDocument />);

    expect(screen.getAllByRole('menuitem').map(({ textContent }) => textContent)).toEqual([
      'Explore in Attacks',
    ]);
    expect(screen.queryByTestId(ACTION_MENU_GROUP_SEPARATOR_TEST_ID)).not.toBeInTheDocument();
    expect(
      screen
        .getByTestId(EXPLORE_IN_ATTACKS_ACTION_ID)
        .querySelector('[data-euiicon-type="external"]')
    ).toBeInTheDocument();
  });
});
