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
  REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID,
  REMOVE_ATTACK_BUTTON_TEST_ID,
  REMOVE_ATTACK_MODAL_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { APP_ID } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { allCasesPermissions, noCasesPermissions } from '../../../../cases_test_utils';
import type { CaseAttachment } from '../utils';
import { RemoveAttackButton } from './remove_attack_button';
import { useRemovableAlertAttachments } from '../hooks/use_removable_alert_attachments';

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

const REMOVE_BUTTON_TEST_ID = `${REMOVE_ATTACK_BUTTON_TEST_ID}-so-attack-1`;

describe('RemoveAttackButton', () => {
  const onConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseKibana.services.cases.helpers.canUseCases = jest
      .fn()
      .mockReturnValue(allCasesPermissions());
    useRemovableAlertAttachmentsMock.mockReturnValue({
      isLoading: false,
      isResolvable: true,
      attachmentIds: ['so-alert-1'],
      alertIds: ['alert-1'],
    });
  });

  const renderButton = () =>
    render(
      <TestProviders>
        <RemoveAttackButton
          id="so-attack-1"
          attackId="attack-1"
          attackTitle="Credential dumping on host-1"
          comments={comments}
          onConfirm={onConfirm}
        />
      </TestProviders>
    );

  it('renders nothing when the user cannot delete attachments', () => {
    mockedUseKibana.services.cases.helpers.canUseCases = jest
      .fn()
      .mockReturnValue(noCasesPermissions());

    renderButton();

    expect(screen.queryByTestId(REMOVE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('scopes the permission check to the securitySolution owner', () => {
    renderButton();

    expect(mockedUseKibana.services.cases.helpers.canUseCases).toHaveBeenCalledWith([APP_ID]);
  });

  it('has an accessible label and does not resolve anything until it is clicked', () => {
    renderButton();

    expect(screen.getByLabelText('Remove attack from case')).toBeInTheDocument();
    expect(screen.queryByTestId(REMOVE_ATTACK_MODAL_TEST_ID)).not.toBeInTheDocument();
    expect(useRemovableAlertAttachmentsMock).not.toHaveBeenCalled();
  });

  it('opens the confirmation prompt instead of removing immediately', async () => {
    renderButton();

    await userEvent.click(screen.getByTestId(REMOVE_BUTTON_TEST_ID));

    expect(screen.getByTestId(REMOVE_ATTACK_MODAL_TEST_ID)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('removes nothing when the prompt is cancelled', async () => {
    renderButton();

    await userEvent.click(screen.getByTestId(REMOVE_BUTTON_TEST_ID));
    await userEvent.click(screen.getByText('Cancel'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByTestId(REMOVE_ATTACK_MODAL_TEST_ID)).not.toBeInTheDocument();
  });

  it('confirms with no alert attachments when the checkbox is left unchecked', async () => {
    renderButton();

    await userEvent.click(screen.getByTestId(REMOVE_BUTTON_TEST_ID));
    await userEvent.click(screen.getByText('Remove'));

    expect(onConfirm).toHaveBeenCalledWith({ alertAttachmentIds: [] });
  });

  it('confirms with the resolved alert attachments when the checkbox is checked', async () => {
    renderButton();

    await userEvent.click(screen.getByTestId(REMOVE_BUTTON_TEST_ID));
    await userEvent.click(screen.getByTestId(REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID));
    await userEvent.click(screen.getByText('Remove'));

    expect(onConfirm).toHaveBeenCalledWith({ alertAttachmentIds: ['so-alert-1'] });
  });

  it('shows the resolved alert count on the checkbox', async () => {
    useRemovableAlertAttachmentsMock.mockReturnValue({
      isLoading: false,
      isResolvable: true,
      attachmentIds: ['so-alert-1'],
      alertIds: ['alert-1', 'alert-2'],
    });

    renderButton();
    await userEvent.click(screen.getByTestId(REMOVE_BUTTON_TEST_ID));

    expect(screen.getByLabelText('Also remove 2 related alerts')).toBeInTheDocument();
  });

  it('resolves the removable alerts for the attack being removed', async () => {
    renderButton();

    await userEvent.click(screen.getByTestId(REMOVE_BUTTON_TEST_ID));

    expect(useRemovableAlertAttachmentsMock).toHaveBeenCalledWith({
      attackId: 'attack-1',
      comments,
    });
  });
});
