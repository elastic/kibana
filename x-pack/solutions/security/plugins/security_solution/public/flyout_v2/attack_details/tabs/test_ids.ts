/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../flyout/shared/test_ids';

const ATTACK_DETAILS_TEST_ID = `${PREFIX}AttackDetails` as const;

export const TABLE_TAB_CONTENT_TEST_ID = `${ATTACK_DETAILS_TEST_ID}-table` as const;
export const TABLE_TAB_SEARCH_INPUT_TEST_ID =
  `${ATTACK_DETAILS_TEST_ID}-table-search-input` as const;
