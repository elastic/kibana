/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../shared/test_ids';

/* Response */

const RESPONSE_TEST_ID = `${PREFIX}Response` as const;
export const RESPONSE_DETAILS_TEST_ID = `${RESPONSE_TEST_ID}Details` as const;
export const RESPONSE_NO_DATA_TEST_ID = `${RESPONSE_TEST_ID}NoData` as const;
