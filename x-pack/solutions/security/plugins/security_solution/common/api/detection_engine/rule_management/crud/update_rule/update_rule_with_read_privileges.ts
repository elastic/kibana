/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSource, RuleUpdateProps } from '../../../model';

export type ReadAuthRuleUpdateProps = Pick<
  RuleUpdateProps,
  'exceptions_list' | 'note' | 'investigation_fields' | 'enabled'
>;

export type ReadAuthRuleUpdateWithRuleSource = ReadAuthRuleUpdateProps & {
  rule_source: RuleSource;
};

/**
 * Fields that can be edited with read auth permissions.
 * Uses a Record type to ensure this stays in sync with ReadAuthRuleUpdateProps.
 */
export const READ_AUTH_EDIT_FIELDS: Record<keyof ReadAuthRuleUpdateWithRuleSource, true> = {
  exceptions_list: true,
  note: true,
  investigation_fields: true,
  rule_source: true,
  enabled: true,
};
