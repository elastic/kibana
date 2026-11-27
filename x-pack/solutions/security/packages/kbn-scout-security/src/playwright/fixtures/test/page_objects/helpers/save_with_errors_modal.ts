/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * The modal that rule creation and rule editing show before saving a rule that has non-blocking
 * validation errors.
 */
export const getSaveWithErrorsModal = (
  page: ScoutPage
): { modal: Locator; confirmButton: Locator } => {
  const modal = page.testSubj.locator('save-with-errors-confirmation-modal');

  return { modal, confirmButton: modal.getByTestId('confirmModalConfirmButton') };
};
