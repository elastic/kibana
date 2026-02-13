/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/types';
import {
  EXCEPTIONS_UI_EDIT,
  EXCEPTIONS_UI_READ,
  RULES_UI_EDIT,
  RULES_UI_READ,
} from '@kbn/security-solution-features/constants';
import { RULES_FEATURE_ID } from '../../../common/constants';

export interface RulesUICapabilities {
  rules: { read: boolean; edit: boolean };
  exceptions: { read: boolean; edit: boolean };
}

export const getRulesCapabilitiesInitialState = () => ({
  rules: { read: false, edit: false },
  exceptions: { read: false, edit: false },
});

export const extractRulesCapabilities = (capabilities: Capabilities): RulesUICapabilities => {
  const rulesCapabilities = capabilities[RULES_FEATURE_ID];

  // Rules permissions
  const readRules = rulesCapabilities?.[RULES_UI_READ] === true;
  const editRules = rulesCapabilities?.[RULES_UI_EDIT] === true;

  // Exceptions permissions
  const readExceptions = rulesCapabilities?.[EXCEPTIONS_UI_READ] === true;
  const editExceptions = rulesCapabilities?.[EXCEPTIONS_UI_EDIT] === true;

  return {
    rules: { read: readRules, edit: editRules },
    exceptions: { read: readExceptions, edit: editExceptions },
  };
};
