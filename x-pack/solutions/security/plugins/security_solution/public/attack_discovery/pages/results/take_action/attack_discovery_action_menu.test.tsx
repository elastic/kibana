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
  ATTACK_AI_ACTION_IDS,
  ATTACK_DISCOVERY_ACTION_IDS,
  RUN_ATTACK_WORKFLOW_ACTION_ID,
} from '../../../../common/constants/action_ids';
import { ACTION_MENU_GROUP_SEPARATOR_TEST_ID } from '../../../../common/utils/action_menu_items';
import { AttackDiscoveryActionMenu } from './attack_discovery_action_menu';

const createItem = (key: string, name: string): EuiContextMenuPanelItemDescriptor => ({
  key,
  name,
  'data-test-subj': key,
});

const defaultProps = {
  aiItems: [createItem(ATTACK_AI_ACTION_IDS.viewInAiAssistant, 'View in AI Assistant')],
  caseItems: [createItem(ATTACK_DISCOVERY_ACTION_IDS.addToCase, 'Add to case')],
  datasetItems: [createItem(ATTACK_DISCOVERY_ACTION_IDS.addToDataset, 'Add to dataset')],
  panels: [],
  statusItems: [createItem(ATTACK_DISCOVERY_ACTION_IDS.markAsOpen, 'Mark as open')],
  workflowItems: [createItem(RUN_ATTACK_WORKFLOW_ACTION_ID, 'Run workflow')],
};

describe('AttackDiscoveryActionMenu', () => {
  it('orders attack discovery action groups and decorates them with icons', () => {
    render(<AttackDiscoveryActionMenu {...defaultProps} />);

    expect(screen.getAllByRole('menuitem').map(({ textContent }) => textContent)).toEqual([
      'Mark as open',
      'Add to case',
      'Run workflow',
      'View in AI Assistant',
      'Add to dataset',
    ]);
    expect(screen.getAllByTestId(ACTION_MENU_GROUP_SEPARATOR_TEST_ID)).toHaveLength(4);
    expect(
      screen
        .getByTestId(ATTACK_DISCOVERY_ACTION_IDS.markAsOpen)
        .querySelector('[data-euiicon-type="dot"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId(ATTACK_DISCOVERY_ACTION_IDS.addToCase)
        .querySelector('[data-euiicon-type="briefcase"]')
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
  });

  it('does not render separators around empty groups', () => {
    render(
      <AttackDiscoveryActionMenu
        {...defaultProps}
        aiItems={[]}
        datasetItems={[]}
        statusItems={[]}
        workflowItems={[]}
      />
    );

    expect(screen.getAllByRole('menuitem').map(({ textContent }) => textContent)).toEqual([
      'Add to case',
    ]);
    expect(screen.queryByTestId(ACTION_MENU_GROUP_SEPARATOR_TEST_ID)).not.toBeInTheDocument();
  });
});
