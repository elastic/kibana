/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTENT_TEST_ID, HEADER_TEST_ID } from '../../shared/components/expandable_section';
import { PREFIX } from '../../../flyout/shared/test_ids';

const RULE_DETAILS_TEST_ID = `${PREFIX}RuleDetails` as const;

export const RULE_DETAILS_TITLE_TEST_ID = `${RULE_DETAILS_TEST_ID}Title` as const;
export const RULE_DETAILS_TITLE_LINK_TEST_ID = `${RULE_DETAILS_TEST_ID}TitleLink` as const;
export const RULE_DETAILS_SUPPRESSED_TEST_ID = `${RULE_DETAILS_TEST_ID}Suppressed` as const;
export const RULE_DETAILS_CREATED_BY_TEST_ID = `${RULE_DETAILS_TEST_ID}CreatedBy` as const;
export const RULE_DETAILS_UPDATED_BY_TEST_ID = `${RULE_DETAILS_TEST_ID}UpdatedBy` as const;

export const RULE_DETAILS_ABOUT_TEST_ID = `${RULE_DETAILS_TEST_ID}AboutSection` as const;
export const RULE_DETAILS_ABOUT_HEADER_TEST_ID = RULE_DETAILS_ABOUT_TEST_ID + HEADER_TEST_ID;
export const RULE_DETAILS_ABOUT_CONTENT_TEST_ID = RULE_DETAILS_ABOUT_TEST_ID + CONTENT_TEST_ID;

export const RULE_DETAILS_DEFINITION_TEST_ID = `${RULE_DETAILS_TEST_ID}DefinitionSection` as const;
export const RULE_DETAILS_DEFINITION_HEADER_TEST_ID =
  RULE_DETAILS_DEFINITION_TEST_ID + HEADER_TEST_ID;
export const RULE_DETAILS_DEFINITION_CONTENT_TEST_ID =
  RULE_DETAILS_DEFINITION_TEST_ID + CONTENT_TEST_ID;

export const RULE_DETAILS_SCHEDULE_TEST_ID = `${RULE_DETAILS_TEST_ID}ScheduleSection` as const;
export const RULE_DETAILS_SCHEDULE_HEADER_TEST_ID = RULE_DETAILS_SCHEDULE_TEST_ID + HEADER_TEST_ID;
export const RULE_DETAILS_SCHEDULE_CONTENT_TEST_ID =
  RULE_DETAILS_SCHEDULE_TEST_ID + CONTENT_TEST_ID;

export const RULE_DETAILS_ACTIONS_TEST_ID = `${RULE_DETAILS_TEST_ID}ActionsSection` as const;
export const RULE_DETAILS_ACTIONS_HEADER_TEST_ID = RULE_DETAILS_ACTIONS_TEST_ID + HEADER_TEST_ID;
export const RULE_DETAILS_ACTIONS_CONTENT_TEST_ID = RULE_DETAILS_ACTIONS_TEST_ID + CONTENT_TEST_ID;

export const RULE_DETAILS_LOADING_TEST_ID = `${RULE_DETAILS_TEST_ID}Loading` as const;

export const RULE_DETAILS_FOOTER_TEST_ID = `${RULE_DETAILS_TEST_ID}Footer` as const;
