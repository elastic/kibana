/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiButton } from '@elastic/eui';
import {
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
} from '@kbn/rule-data-utils';
import { paths } from '../../../common/locators/paths';
import { useKibana } from '../../utils/kibana_react';

export function NewRulesCallout({ ruleTypeId }: { ruleTypeId?: string }) {
  const { http, application } = useKibana().services;

  if (!ruleTypeId || !SHOW_NEW_RULES_CALLOUT_RULE_TYPES.includes(ruleTypeId)) return null;

  const handleCreateRuleClick = (newRuleTypeId: string) => {
    application.navigateToUrl(http.basePath.prepend(paths.observability.createRule(newRuleTypeId)));
  };

  return (
    <EuiCallOut title={CALLOUT_TITLE}>
      <p>{CALLOUT_DESCRIPTION}</p>
      <EuiFlexGroup>
        <EuiButton
          data-test-subj="newRulesCallout-createCTRRuleButton"
          onClick={() => handleCreateRuleClick(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID)}
        >
          {CREATE_CTR_RULE_LABEL}
        </EuiButton>
        <EuiButton
          data-test-subj="newRulesCallout-createESQRuleButton"
          onClick={() => handleCreateRuleClick(ES_QUERY_ID)}
        >
          {CREATE_ESQ_RULE_LABEL}
        </EuiButton>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}

const SHOW_NEW_RULES_CALLOUT_RULE_TYPES = [
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
];

const CALLOUT_TITLE = i18n.translate('xpack.observability.newRulesCallout.title', {
  defaultMessage: 'Try our new rules instead',
});

const CALLOUT_DESCRIPTION = i18n.translate('xpack.observability.newRulesCallout.description', {
  defaultMessage:
    'Consider using the Custom threshold rule or Elasticsearch query rule, which offer more flexibility and customization options.',
});

const CREATE_CTR_RULE_LABEL = i18n.translate('xpack.observability.newRulesCallout.createCTRule', {
  defaultMessage: 'Create Custom threshold rule',
});

const CREATE_ESQ_RULE_LABEL = i18n.translate('xpack.observability.newRulesCallout.createESQRule', {
  defaultMessage: 'Create Elasticsearch query rule',
});
