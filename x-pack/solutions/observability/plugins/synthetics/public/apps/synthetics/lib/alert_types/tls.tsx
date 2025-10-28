/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_REASON, SYNTHETICS_ALERT_RULE_TYPES } from '@kbn/rule-data-utils';
import type { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import {
  RULE_PREBUILD_DESCRIPTION_FIELDS,
  type RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import { TlsTranslations } from '../../../../../common/rules/synthetics/translations';
import { CERTIFICATES_ROUTE } from '../../../../../common/constants/ui';

import type { AlertTypeInitializer } from './types';

let validateFunc: (ruleParams: any) => ValidationResult;

const { defaultActionMessage, defaultRecoveryMessage, description } = TlsTranslations;
const TLSAlert = React.lazy(() => import('./lazy_wrapper/tls_alert'));

export const getDescriptionFields: GetDescriptionFieldsFn<TLSRuleParams> = ({
  rule,
  prebuildFields,
}) => {
  if (!rule || !prebuildFields) {
    return [];
  }

  if (rule.params.kqlQuery) {
    return [prebuildFields[RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY](rule.params.kqlQuery)];
  }

  return [];
};

export const initTlsAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): ObservabilityRuleTypeModel => ({
  id: SYNTHETICS_ALERT_RULE_TYPES.TLS,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.links.observability.syntheticsAlerting}`;
  },
  ruleParamsExpression: (params: RuleTypeParamsExpressionProps<TLSRuleParams>) => (
    <TLSAlert
      coreStart={core}
      plugins={plugins}
      ruleParams={params.ruleParams}
      setRuleParams={params.setRuleParams}
    />
  ),
  description,
  validate: (ruleParams: any) => {
    if (!validateFunc) {
      (async function loadValidate() {
        const { validateTLSAlertParams } = await import('./lazy_wrapper/validate_tls_alert');
        validateFunc = validateTLSAlertParams;
      })();
    }
    return validateFunc ? validateFunc(ruleParams) : ({} as ValidationResult);
  },
  defaultActionMessage,
  defaultRecoveryMessage,
  requiresAppContext: false,
  format: ({ fields }) => ({
    reason: fields[ALERT_REASON] || '',
    link: `/app/synthetics${CERTIFICATES_ROUTE}`,
  }),
  getDescriptionFields,
});
