/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
} from '@kbn/rule-data-utils';
import type { TopAlert } from '../../../typings/alerts';
import { paths } from '../../../../common/locators/paths';
import { useKibana } from '../../../utils/kibana_react';
import { getAlertSubtitle } from '../../../utils/format_alert_subtitle';
import { useAuthorizedToReadRuleType } from '../../../hooks/use_authorized_to_read_rule_type';

export interface AlertSubtitleProps {
  alert: TopAlert;
}

export function AlertSubtitle({ alert }: AlertSubtitleProps) {
  const { http } = useKibana().services;
  const { authorizedToReadRuleType } = useAuthorizedToReadRuleType();

  const ruleId = alert.fields[ALERT_RULE_UUID];
  const ruleLink = http.basePath.prepend(paths.observability.ruleDetails(ruleId));
  const ruleTypeBreached = getAlertSubtitle(alert.fields[ALERT_RULE_CATEGORY]);
  const canReadAlertRule = authorizedToReadRuleType(
    alert.fields[ALERT_RULE_TYPE_ID],
    alert.fields[ALERT_RULE_CONSUMER]
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiText size="s" color="subdued">
        {ruleTypeBreached}
      </EuiText>
      {canReadAlertRule && ruleId && (
        <EuiText size="s">
          <EuiLink data-test-subj="o11yAlertRuleLink" href={ruleLink}>
            {i18n.translate('xpack.observability.pages.alertDetails.pageTitle.viewRule', {
              defaultMessage: 'View rule',
            })}
          </EuiLink>
        </EuiText>
      )}
    </EuiFlexGroup>
  );
}
