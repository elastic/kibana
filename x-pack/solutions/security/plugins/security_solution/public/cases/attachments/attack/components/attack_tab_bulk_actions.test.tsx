/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import {
  ATTACK_TAB_BULK_ACTIONS_TEST_ID,
  ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID,
  REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID,
  REMOVE_ATTACK_MODAL_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { APP_ID } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { allCasesPermissions, noCasesPermissions } from '../../../../cases_test_utils';
import type { CaseAttachment } from '../utils';
import { useRemovableAlertAttachments } from '../hooks/use_removable_alert_attachments';
import type { SelectedAttack } from './attack_tab_bulk_actions';
import { AttackTabBulkActions } from './attack_tab_bulk_actions';

jest.mock('../../../../common/lib/kibana');
jest.mock('../hooks/use_removable_alert_attachments');

const useRemovableAlertAttachmentsMock = useRemovableAlertAttachments as jest.Mock;
const mockedUseKibana = mockUseKibana();

const comments = [
  {
    id: 'so-attack-1',
    type: SECURITY_ATTACK_ATTACHMENT_TYPE,
    attachmentId: 'attack-1',
    metadata: { title: 'attack-1', alertCount: 1, index: '.alerts-attack' },
  },
  {
    id: 'so-alert-1',
    type: SECURITY_ALERT_ATTACHMENT_TYPE,
    attachmentId: ['alert-1'],
    metadata: { index: '.alerts-detections' },
  },
] as unknown as CaseAttachment[];

const twoAttacks: SelectedAttack[] = [
  { attackId: 'attack-1', title: 'Credential dumping on host-1' },
  { attackId: 'attack-2', title: 'Lateral movement to host-2' },
];

describe('AttackTabBulkActions', () => {
  const onConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseKibana.services.cases.helpers.canUseCases = jest
      .fn()
      .mockReturnValue(allCasesPermissions());
    useRemovableAlertAttachmentsMock.mockReturnValue({
      isLoading: false,
      isResolvable: true,
      attachmentIds: ['so-alert-1', 'so-alert-2'],
      alertIds: ['alert-1', 'alert-2'],
    });
  });

  const renderBar = (selectedAttacks: SelectedAttack[], isRemoving = false) =>
    render(
      <TestProviders>
        <AttackTabBulkActions
          comments={comments}
          isRemoving={isRemoving}
          onConfirm={onConfirm}
          selectedAttacks={selectedAttacks}
        />
      </TestProviders>
    );

  it('renders nothing while no row is selected', () => {
    renderBar([]);

    expect(screen.queryByTestId(ATTACK_TAB_BULK_ACTIONS_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders nothing when the user cannot delete attachments', () => {
    mockedUseKibana.services.cases.helpers.canUseCases = jest
      .fn()
      .mockReturnValue(noCasesPermissions());

    renderBar(twoAttacks);

    expect(screen.queryByTestId(ATTACK_TAB_BULK_ACTIONS_TEST_ID)).not.toBeInTheDocument();
  });

  it('scopes the permission check to the securitySolution owner', () => {
    renderBar(twoAttacks);

    expect(mockedUseKibana.services.cases.helpers.canUseCases).toHaveBeenCalledWith([APP_ID]);
  });

  it('counts the selection and offers removal as its only action', () => {
    renderBar(twoAttacks);

    const bar = screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_TEST_ID);

    expect(bar).toHaveTextContent('2 attacks selected');
    expect(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID)).toHaveTextContent(
      'Remove from case'
    );
    expect(bar.querySelectorAll('button')).toHaveLength(1);
  });

  it('disables the action while a removal is in flight', () => {
    renderBar(twoAttacks, true);

    expect(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('resolves nothing until the action is used', () => {
    renderBar(twoAttacks);

    expect(useRemovableAlertAttachmentsMock).not.toHaveBeenCalled();
  });

  it('resolves the removable alerts across the whole selection', async () => {
    renderBar(twoAttacks);

    await userEvent.click(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID));

    expect(useRemovableAlertAttachmentsMock).toHaveBeenCalledWith({
      attackIds: ['attack-1', 'attack-2'],
      comments,
    });
  });

  it('names the selection by count in the prompt', async () => {
    renderBar(twoAttacks);

    await userEvent.click(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID));

    expect(screen.getByTestId(REMOVE_ATTACK_MODAL_TEST_ID)).toHaveTextContent(
      '2 attacks will be removed from this case.'
    );
  });

  it('names the attack itself when a single row is selected', async () => {
    renderBar([twoAttacks[0]]);

    await userEvent.click(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID));

    expect(screen.getByTestId(REMOVE_ATTACK_MODAL_TEST_ID)).toHaveTextContent(
      'Credential dumping on host-1 will be removed from this case.'
    );
  });

  it('removes nothing when the prompt is cancelled', async () => {
    renderBar(twoAttacks);

    await userEvent.click(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID));
    await userEvent.click(screen.getByText('Cancel'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByTestId(REMOVE_ATTACK_MODAL_TEST_ID)).not.toBeInTheDocument();
  });

  it('confirms with no alert attachments when the checkbox is left unchecked', async () => {
    renderBar(twoAttacks);

    await userEvent.click(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID));
    await userEvent.click(screen.getByText('Remove'));

    expect(onConfirm).toHaveBeenCalledWith({ alertAttachmentIds: [] });
  });

  it('confirms with the alert attachments resolved for the selection', async () => {
    renderBar(twoAttacks);

    await userEvent.click(screen.getByTestId(ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID));
    await userEvent.click(screen.getByTestId(REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID));
    await userEvent.click(screen.getByText('Remove'));

    expect(onConfirm).toHaveBeenCalledWith({
      alertAttachmentIds: ['so-alert-1', 'so-alert-2'],
    });
  });
});
