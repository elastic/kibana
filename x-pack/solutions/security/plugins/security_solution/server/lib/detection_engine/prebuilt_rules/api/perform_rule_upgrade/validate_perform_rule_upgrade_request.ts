/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type { PerformRuleUpgradeRequestBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { ModeEnum } from '../../../../../../common/api/detection_engine/prebuilt_rules';

export function validatePerformRuleUpgradeRequest({
  isRulesCustomizationEnabled,
  payload,
  defaultPickVersion,
}: {
  isRulesCustomizationEnabled: boolean;
  payload: PerformRuleUpgradeRequestBody;
  defaultPickVersion: string;
}) {
  if (isRulesCustomizationEnabled) {
    // Rule customization is enabled; no additional validation is needed
    return;
  }

  // Rule can be upgraded to the default (TARGET) version only
  if (payload.pick_version && payload.pick_version !== defaultPickVersion) {
    throw new BadRequestError(
      `Only the '${defaultPickVersion}' version can be selected for a rule update; received: '${payload.pick_version}'`
    );
  }

  // If specific rules are provided, ensure that there are no customizations and
  // that the default pick version is selected
  if (payload.mode === ModeEnum.SPECIFIC_RULES) {
    payload.rules.forEach((rule) => {
      if (rule.pick_version && rule.pick_version !== defaultPickVersion) {
        throw new BadRequestError(
          `Only the '${defaultPickVersion}' version can be selected for a rule update; received: '${rule.pick_version}'`
        );
      }
      if (rule.fields && Object.keys(rule.fields).length > 0) {
        throw new BadRequestError(
          `Rule field customization is not allowed. Received fields: ${Object.keys(
            rule.fields
          ).join(', ')}`
        );
      }
    });
  }
}
