/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMenuConfig } from '@kbn/app-menu';
import { ResponseActionsHistoryAppMenu } from './response_actions_history_app_menu';
import type { EndpointResponderExtensionComponentProps } from '../types';

jest.mock('../../endpoint_response_actions_list/response_actions_log', () => ({
  ResponseActionsLog: ({ agentIds }: { agentIds: string | string[] }) => (
    <div data-test-subj="mockResponseActionsLog">{JSON.stringify(agentIds)}</div>
  ),
}));

const meta: EndpointResponderExtensionComponentProps['meta'] = {
  agentId: 'agent-a',
  hostName: 'host-a',
  capabilities: ['isolation'],
  platform: 'linux',
};

/** Renders the component the way `ConsoleManager` + the app menu do: owning the `AppMenuConfig` it
 * reports, rendering its primary action as a trigger (disabled per `disableButton`) and invoking
 * `primaryActionItem.run()` with a `returnFocus` that focuses that trigger. */
const TestHarness = () => {
  const [menu, setMenu] = useState<AppMenuConfig>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const primaryAction = menu?.primaryActionItem;
  const disableButton = primaryAction?.disableButton;
  const isDisabled = typeof disableButton === 'function' ? disableButton() : Boolean(disableButton);

  return (
    <>
      <button
        type="button"
        data-test-subj="runPrimaryAction"
        ref={triggerRef}
        disabled={isDisabled}
        onClick={(event) =>
          primaryAction?.run?.({
            triggerElement: event.currentTarget,
            returnFocus: () => triggerRef.current?.focus(),
          })
        }
      >
        {'run'}
      </button>
      <div data-test-subj="menuState">{JSON.stringify(primaryAction ?? null)}</div>
      <ResponseActionsHistoryAppMenu meta={meta} onMenuChange={setMenu} />
    </>
  );
};

describe('ResponseActionsHistoryAppMenu', () => {
  it('reports a primary action item, but renders nothing itself, until the action runs', () => {
    render(<TestHarness />);

    expect(screen.queryByTestId('responderActionLogFlyout')).not.toBeInTheDocument();
    expect(screen.getByTestId('menuState').textContent).toContain('responseActionsHistory');
    expect(screen.getByTestId('menuState').textContent).toContain('responderShowActionLogButton');
  });

  it('opens the flyout when the reported action runs', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByTestId('runPrimaryAction'));

    expect(await screen.findByTestId('responderActionLogFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('mockResponseActionsLog')).toHaveTextContent('agent-a');
  });

  it('reports the action as disabled while the flyout is open', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByTestId('runPrimaryAction'));
    await waitFor(() => {
      expect(screen.getByTestId('menuState').textContent).toContain('"disableButton":true');
    });
  });

  it('returns focus to the (re-enabled) trigger when the flyout closes', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByTestId('runPrimaryAction'));
    const flyout = await screen.findByTestId('responderActionLogFlyout');
    expect(screen.getByTestId('runPrimaryAction')).toBeDisabled();

    await user.click(within(flyout).getByTestId('euiFlyoutCloseButton'));

    await waitFor(() => {
      expect(screen.getByTestId('runPrimaryAction')).toHaveFocus();
    });
    expect(screen.queryByTestId('responderActionLogFlyout')).not.toBeInTheDocument();
  });

  it('clears the reported menu on unmount', () => {
    const onMenuChange = jest.fn();
    const { unmount } = render(
      <ResponseActionsHistoryAppMenu meta={meta} onMenuChange={onMenuChange} />
    );

    onMenuChange.mockClear();
    unmount();

    expect(onMenuChange).toHaveBeenCalledWith(undefined);
  });
});
