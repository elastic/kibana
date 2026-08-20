/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWorkflowUserActionAction } from './render_workflow_user_action_action';

jest.mock('@kbn/cases-plugin/public', () => ({
  ShowTableButton: () => <button type="button">{'Show table'}</button>,
}));

jest.mock('../attachments/alert/components/show_alert_button', () => ({
  ShowAlertButton: ({ alertId, index }: { alertId: string; index: string }) => (
    <button type="button">{`Show alert ${alertId} from ${index}`}</button>
  ),
}));

describe('renderWorkflowUserActionAction', () => {
  it('renders the alert details action when the index is available', async () => {
    render(
      <>
        {renderWorkflowUserActionAction({
          origin: {
            type: 'cases.alert',
            id: 'alert-1',
            index: '.alerts-security.alerts-default',
          },
          userActionId: 'user-action-1',
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
  ])('renders the alerts table action for $type without alert details', (origin) => {
    render(
      <>
        {renderWorkflowUserActionAction({
          origin,
          userActionId: 'user-action-1',
        })}
      </>
    );

    expect(screen.getByRole('button', { name: 'Show table' })).toBeInTheDocument();
  });

  it('does not render an action for other origins', () => {
    const action = renderWorkflowUserActionAction({
      origin: {
        type: 'cases.observable',
        id: 'observable-1',
        typeKey: 'ip',
        value: '10.0.0.8',
      },
      userActionId: 'user-action-1',
    });

    expect(action).toBeNull();
  });
});
