/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pageObjects as pageObjectsCommon } from '../../../test/functional/page_objects';
import { pageObjects as pageObjectsXpack } from '../functional/page_objects';

export const pageObjects = {
  ...pageObjectsCommon,
  ...pageObjectsXpack,
};
