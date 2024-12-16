/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Page } from '@playwright/test';
import { ASSISTANT_BUTTON } from './selectors';

export const openAssistant = (page: Page) => async () =>
  await page.getByTestId(ASSISTANT_BUTTON).click();
