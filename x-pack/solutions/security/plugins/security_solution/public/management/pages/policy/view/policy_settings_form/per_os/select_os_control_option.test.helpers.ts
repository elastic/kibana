/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderResult } from '@testing-library/react';
import { act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Opens an EuiSuperSelect and chooses an option. The options mount in a popover that carries
 * `pointer-events: none` while it animates open, so the pointer-events check is skipped and the
 * option is awaited rather than queried synchronously.
 */
export const selectOsControlOption = async (
  renderResult: RenderResult,
  selectTestSubj: string,
  optionName: string | RegExp
): Promise<void> => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  await user.click(renderResult.getByTestId(selectTestSubj));
  await user.click(await renderResult.findByRole('option', { name: optionName }));
};

/** Opens an OS select and scrolls after EUI's listener-registration delay, using fake timers. */
export const openOsControlAndScrollPage = async (
  renderResult: RenderResult,
  selectTestSubj: string
): Promise<void> => {
  const user = userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
    pointerEventsCheck: 0,
  });

  await user.click(renderResult.getByTestId(selectTestSubj));
  await renderResult.findByRole('listbox');
  // EuiInputPopover waits 500ms before registering its scroll listener.
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
  await act(async () => {
    fireEvent.scroll(renderResult.container);
  });
};
