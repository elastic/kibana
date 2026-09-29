/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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

vi.mock('../../../../common/lib/kibana');
vi.mock('../../../containers/detection_engine/alerts/use_alerts_privileges');

describe('MoreActionsRowControlColumn', () => {
  it('should render component with all options', async () => {
    (useAlertsPrivileges as Mock).mockReturnValue({ hasAlertsUpdate: true });
    (useKibana as Mock).mockReturnValue({
      services: {
        cases: {
          ...mockCasesContract(),
          helpers: {
            canUseCases: vi.fn().mockReturnValue({
              read: true,
              createComment: true,
            }),
            getRuleIdFromEvent: vi.fn(),
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
    (useAlertsPrivileges as Mock).mockReturnValue({ hasAlertsUpdate: true });
    (useKibana as Mock).mockReturnValue({
      services: {
        cases: {
          ...mockCasesContract(),
          helpers: {
            canUseCases: vi.fn().mockReturnValue({
              read: false,
              createComment: false,
            }),
            getRuleIdFromEvent: vi.fn(),
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

  it('should not show tags actions if user is not authorized', async () => {
    (useAlertsPrivileges as Mock).mockReturnValue({ hasAlertsUpdate: false });
    (useKibana as Mock).mockReturnValue({
      services: {
        cases: {
          ...mockCasesContract(),
          helpers: {
            canUseCases: vi.fn().mockReturnValue({
              read: true,
              createComment: true,
            }),
            getRuleIdFromEvent: vi.fn(),
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
