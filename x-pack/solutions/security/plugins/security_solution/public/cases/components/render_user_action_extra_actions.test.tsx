/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderUserActionExtraActions } from './render_user_action_extra_actions';
import type { UserActionUI } from '@kbn/cases-plugin/common/ui/types';

jest.mock('@kbn/cases-plugin/public', () => ({
  ShowTableButton: () => <button type="button">{'Show table'}</button>,
}));

jest.mock('../attachments/alert/components/show_alert_button', () => ({
  ShowAlertButton: ({ alertId, index }: { alertId: string; index: string }) => (
    <button type="button">{`Show alert ${alertId} from ${index}`}</button>
  ),
}));

/** Minimal workflow user action stub for tests. */
const makeWorkflowUserAction = (origin: Record<string, unknown>): UserActionUI =>
  ({
    id: 'user-action-1',
    type: 'workflow',
    payload: {
      workflow: { id: 'wf-1', name: 'My Workflow', executionId: 'exec-1' },
      origin,
    },
  } as unknown as UserActionUI);

describe('renderUserActionExtraActions', () => {
  it('renders the alert details action when the index is available', async () => {
    render(
      <>
        {renderUserActionExtraActions({
          userAction: makeWorkflowUserAction({
            type: 'cases.alert',
            id: 'alert-1',
            index: '.alerts-security.alerts-default',
          }),
        })}
      </>
    );

    expect(
      await screen.findByRole('button', {
        name: 'Show alert alert-1 from .alerts-security.alerts-default',
      })
    ).toBeInTheDocument();
  });

  it.each([
    { type: 'cases.alert' as const, id: 'alert-1' },
    { type: 'cases.alerts' as const, id: 'case-1' },
  ])('renders the alerts table action for $type without an index', (origin) => {
    render(
      <>
        {renderUserActionExtraActions({
          userAction: makeWorkflowUserAction(origin),
        })}
      </>
    );

    expect(screen.getByRole('button', { name: 'Show table' })).toBeInTheDocument();
  });

  it('does not render an action for non-alert workflow origins', () => {
    const result = renderUserActionExtraActions({
      userAction: makeWorkflowUserAction({
        type: 'cases.observable',
        id: 'observable-1',
        typeKey: 'ip',
        value: '10.0.0.8',
      }),
    });

    expect(result).toBeNull();
  });

  it('does not render an action for non-workflow user action types', () => {
    const result = renderUserActionExtraActions({
      userAction: {
        id: 'ua-title-1',
        type: 'title',
        payload: { title: 'Updated title' },
      } as unknown as UserActionUI,
    });

    expect(result).toBeNull();
  });
});
