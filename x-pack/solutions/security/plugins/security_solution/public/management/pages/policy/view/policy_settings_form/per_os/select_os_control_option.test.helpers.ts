/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderResult } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Opens an EuiSuperSelect, chooses an option, and waits for the popover to close.
 */
export const selectOsControlOption = async (
  renderResult: RenderResult,
  selectTestSubj: string,
  optionName: string | RegExp
): Promise<void> => {
  await userEvent.click(renderResult.getByTestId(selectTestSubj));
  await userEvent.click(await renderResult.findByRole('option', { name: optionName }));
  // Wait until the listbox unmounts so a later cycle cannot click an option in a closing popover.
  await waitFor(() => {
    if (renderResult.queryByRole('listbox')) {
      throw new Error('select listbox is still mounted');
    }
  });
};
