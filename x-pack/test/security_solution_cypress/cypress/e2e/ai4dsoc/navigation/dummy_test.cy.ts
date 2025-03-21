/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { GET_STARTED_URL } from '../../../urls/navigation';

describe('Dummy Test ', { tags: '@serverless' }, () => {
  beforeEach(() => {
    login();
    visit(GET_STARTED_URL);
  });
});
