/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';

import { exceptionListAgnosticType, exceptionListType } from './exception_list';

export const initSavedObjects = (savedObjects: CoreSetup['savedObjects']): void => {
  savedObjects.registerType(exceptionListAgnosticType);
  savedObjects.registerType(exceptionListType);
};
