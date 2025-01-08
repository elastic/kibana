/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { act, fireEvent, waitForElementToBeRemoved, screen } from '@testing-library/react';

const REMOVE_INTEGRATION_ROW_BUTTON_TEST_ID = 'relatedIntegrationRemove';

export function waitForIntegrationsToBeLoaded(): Promise<void> {
  return waitForElementToBeRemoved(screen.queryAllByRole('progressbar'));
}

export function addRelatedIntegrationRow(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Add integration'));
  });
}

export function removeLastRelatedIntegrationRow(): Promise<void> {
  return act(async () => {
    const lastRemoveButton = screen.getAllByTestId(REMOVE_INTEGRATION_ROW_BUTTON_TEST_ID).at(-1);

    if (!lastRemoveButton) {
      throw new Error(`There are no "${REMOVE_INTEGRATION_ROW_BUTTON_TEST_ID}" found`);
    }

    fireEvent.click(lastRemoveButton);
  });
}

export function setVersion({
  input,
  value,
}: {
  input: HTMLInputElement;
  value: string;
}): Promise<void> {
  return act(async () => {
    fireEvent.input(input, {
      target: { value },
    });
  });
}
