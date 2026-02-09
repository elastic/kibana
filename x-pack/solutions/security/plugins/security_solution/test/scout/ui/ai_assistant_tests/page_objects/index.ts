/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout-security';
import { createLazyPageObject } from '@kbn/scout-security';
import { AssistantPage } from './assistant';

export interface AiAssistantPageObjects extends PageObjects {
  assistant: AssistantPage;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage
): AiAssistantPageObjects {
  return {
    ...pageObjects,
    assistant: createLazyPageObject(AssistantPage, page),
  };
}
