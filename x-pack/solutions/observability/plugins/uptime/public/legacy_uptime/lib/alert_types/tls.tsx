/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { TLSParams } from '../../../../common/runtime_types/alerts/tls';
import { CLIENT_ALERT_TYPES } from '../../../../common/constants/uptime_alerts';
import { TlsTranslations } from '../../../../common/rules/legacy_uptime/translations';
import { AlertTypeInitializer } from '.';

import { CERTIFICATES_ROUTE } from '../../../../common/constants/ui';

let validateFunc: (ruleParams: any) => ValidationResult;

const { defaultActionMessage, defaultRecoveryMessage, description } = TlsTranslations;
const TLSAlert = React.lazy(() => import('./lazy_wrapper/tls_alert'));
export const initTlsAlertType: AlertTypeInitializer = ({
  core,
  plugins,
  isHidden,
}): ObservabilityRuleTypeModel => ({
  id: CLIENT_ALERT_TYPES.TLS,
  iconClass: 'uptimeApp',
  documentationUrl(docLinks) {
    return `${docLinks.links.observability.tlsCertificate}`;
  },
  ruleParamsExpression: (params: RuleTypeParamsExpressionProps<TLSParams>) => (
    <TLSAlert
      core={core}
      plugins={plugins}
      id={params.id}
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
  requiresAppContext: isHidden,
  format: ({ fields }) => ({
    reason: fields[ALERT_REASON] || '',
    link: `/app/uptime${CERTIFICATES_ROUTE}`,
  }),
});
