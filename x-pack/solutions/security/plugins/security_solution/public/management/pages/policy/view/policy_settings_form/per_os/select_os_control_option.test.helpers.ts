/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderResult } from '@testing-library/react';
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
