/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as xpackFunctionalPageObjects } from '../../functional/page_objects';
import { FindingsPageProvider } from './findings_page';

export const pageObjects = {
  ...xpackFunctionalPageObjects,
  findings: FindingsPageProvider,
};
