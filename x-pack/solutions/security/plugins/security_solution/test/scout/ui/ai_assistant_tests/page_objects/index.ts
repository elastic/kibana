/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPageObjects, ScoutPage } from '@kbn/scout-security';
import { createLazyPageObject } from '@kbn/scout-security';
import { AssistantPage } from './assistant';

export interface AiAssistantPageObjects extends SecurityPageObjects {
  assistant: AssistantPage;
}

export function extendPageObjects(
  pageObjects: SecurityPageObjects,
  page: ScoutPage
): AiAssistantPageObjects {
  return {
    ...pageObjects,
    assistant: createLazyPageObject(AssistantPage, page),
  };
}
