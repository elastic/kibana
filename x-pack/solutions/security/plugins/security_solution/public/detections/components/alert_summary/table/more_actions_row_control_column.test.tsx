/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  MORE_ACTIONS_BUTTON_TEST_ID,
  MoreActionsRowControlColumn,
} from './more_actions_row_control_column';
import type { Alert } from '@kbn/alerting-types';
import { useKibana } from '../../../../common/lib/kibana';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import userEvent from '@testing-library/user-event';
import { REMOVE_FROM_CASE_ACTION_ID } from '../../../../common/constants/action_ids';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../containers/detection_engine/alerts/use_alerts_privileges');

describe('MoreActionsRowControlColumn', () => {
  it('should render component with all options', async () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsUpdate: true });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          ...mockCasesContract(),
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              read: true,
              createComment: true,
            }),
            getRuleIdFromEvent: jest.fn(),
          },
        },
      },
    });

    const mockAlert: Alert = {
      _id: '_id',
      _index: '_index',
      'event.kind': ['signal'],
      'kibana.alert.workflow_tags': [],
    };

    const { getByTestId } = render(<MoreActionsRowControlColumn alert={mockAlert} />);

    const button = getByTestId(MORE_ACTIONS_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    await userEvent.click(button);

    expect(getByTestId('add-to-case-action')).toBeInTheDocument();
    expect(getByTestId('alert-tags-context-menu-item')).toBeInTheDocument();
  });

  it('should not show cases actions if user is not authorized', async () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsUpdate: true });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          ...mockCasesContract(),
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              read: false,
              createComment: false,
            }),
            getRuleIdFromEvent: jest.fn(),
          },
        },
      },
    });

    const mockAlert: Alert = {
      _id: '_id',
      _index: '_index',
      'event.kind': ['signal'],
      'kibana.alert.workflow_tags': [],
    };

    const { getByTestId, queryByTestId } = render(
      <MoreActionsRowControlColumn alert={mockAlert} />
    );

    const button = getByTestId(MORE_ACTIONS_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    await userEvent.click(button);

    expect(queryByTestId('add-to-case-action')).not.toBeInTheDocument();
  });

  describe('remove from case', () => {
    const mockAlert: Alert = {
      _id: '_id',
      _index: '_index',
      'event.kind': ['signal'],
      'kibana.alert.workflow_tags': [],
    };

    beforeEach(() => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsUpdate: true });
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          cases: {
            ...mockCasesContract(),
            helpers: {
              canUseCases: jest.fn().mockReturnValue({ read: true, createComment: true }),
              getRuleIdFromEvent: jest.fn(),
            },
          },
        },
      });
    });

    it('removes the alert from the case', async () => {
      const onRemoveFromCase = jest.fn();
      const { getByTestId } = render(
        <MoreActionsRowControlColumn alert={mockAlert} onRemoveFromCase={onRemoveFromCase} />
      );

      await userEvent.click(getByTestId(MORE_ACTIONS_BUTTON_TEST_ID));
      await userEvent.click(getByTestId(REMOVE_FROM_CASE_ACTION_ID));

      expect(onRemoveFromCase).toHaveBeenCalledWith('_id');
    });

    it('hides the action without onRemoveFromCase', async () => {
      const { getByTestId, queryByTestId } = render(
        <MoreActionsRowControlColumn alert={mockAlert} />
      );

      await userEvent.click(getByTestId(MORE_ACTIONS_BUTTON_TEST_ID));

      expect(queryByTestId(REMOVE_FROM_CASE_ACTION_ID)).not.toBeInTheDocument();
    });
  });

  it('should not show tags actions if user is not authorized', async () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsUpdate: false });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          ...mockCasesContract(),
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              read: true,
              createComment: true,
            }),
            getRuleIdFromEvent: jest.fn(),
          },
        },
      },
    });

    const mockAlert: Alert = {
      _id: '_id',
      _index: '_index',
      'event.kind': ['signal'],
      'kibana.alert.workflow_tags': [],
    };

    const { getByTestId, queryByTestId } = render(
      <MoreActionsRowControlColumn alert={mockAlert} />
    );

    const button = getByTestId(MORE_ACTIONS_BUTTON_TEST_ID);
    expect(button).toBeInTheDocument();

    await userEvent.click(button);

    expect(queryByTestId('alert-tags-context-menu-item')).not.toBeInTheDocument();
  });
});
