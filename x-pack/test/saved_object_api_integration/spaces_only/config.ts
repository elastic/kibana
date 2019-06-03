/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTestConfig } from '../common/config';

// eslint-disable-next-line import/no-default-export
export default createTestConfig('spaces_only', { disabledPlugins: ['security'], license: 'basic' });
