/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { TopAlert } from '../../../typings/alerts';
import { paths } from '../../../../common/locators/paths';
import { useKibana } from '../../../utils/kibana_react';

export interface AlertSubtitleProps {
  alert: TopAlert;
  ruleTypeTitle: string;
}

export function AlertSubtitle({ alert, ruleTypeTitle }: AlertSubtitleProps) {
  const { http } = useKibana().services;

  const ruleId = alert.fields[ALERT_RULE_UUID];
  const ruleLink = http.basePath.prepend(paths.observability.ruleDetails(ruleId));

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiText size="s" color="subdued">
        {ruleTypeTitle}
      </EuiText>
      <EuiText size="s">
        <EuiLink data-test-subj="o11yAlertRuleLink" href={ruleLink}>
          {i18n.translate('xpack.observability.pages.alertDetails.pageTitle.viewRule', {
            defaultMessage: 'View rule',
          })}
        </EuiLink>
      </EuiText>
    </EuiFlexGroup>
  );
}
