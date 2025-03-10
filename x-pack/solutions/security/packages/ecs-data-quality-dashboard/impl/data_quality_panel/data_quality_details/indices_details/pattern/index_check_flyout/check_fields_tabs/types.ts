/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INCOMPATIBLE_TAB_ID,
  SAME_FAMILY_TAB_ID,
  ALL_TAB_ID,
  CUSTOM_TAB_ID,
  ECS_COMPLIANT_TAB_ID,
} from '../constants';

export interface CheckFieldsTabBase {
  name: string;
  badgeCount?: number;
  badgeColor?: string;
  content?: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}

export type CheckFieldsTabId =
  | typeof INCOMPATIBLE_TAB_ID
  | typeof SAME_FAMILY_TAB_ID
  | typeof CUSTOM_TAB_ID
  | typeof ECS_COMPLIANT_TAB_ID
  | typeof ALL_TAB_ID;

export type CheckFieldsIncompatibleTab = CheckFieldsTabBase & {
  id: typeof INCOMPATIBLE_TAB_ID;
};

export type CheckFieldsSameFamilyTab = CheckFieldsTabBase & {
  id: typeof SAME_FAMILY_TAB_ID;
};

export type CheckFieldsCustomTab = CheckFieldsTabBase & {
  id: typeof CUSTOM_TAB_ID;
};

export type CheckFieldsEcsCompliantTab = CheckFieldsTabBase & {
  id: typeof ECS_COMPLIANT_TAB_ID;
};

export type CheckFieldsAllTab = CheckFieldsTabBase & {
  id: typeof ALL_TAB_ID;
};

export type CheckFieldsTab =
  | CheckFieldsIncompatibleTab
  | CheckFieldsSameFamilyTab
  | CheckFieldsCustomTab
  | CheckFieldsEcsCompliantTab
  | CheckFieldsAllTab;
