/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
} from '@kbn/rule-data-utils';
import type { TopAlert } from '../../../typings/alerts';
import { paths } from '../../../../common/locators/paths';
import { useKibana } from '../../../utils/kibana_react';
import { getAlertSubtitle } from '../../../utils/format_alert_subtitle';
import { useAuthorizedToReadRuleType } from '../../../hooks/use_authorized_to_read_rule_type';
import type { RuleLinkStatus } from '../../../components/alert_overview/alert_overview';
import { RuleDeletedModal } from './rule_deleted_modal';

export interface AlertSubtitleProps {
  alert: TopAlert;
  ruleStatus?: RuleLinkStatus;
}

export function AlertSubtitle({ alert, ruleStatus }: AlertSubtitleProps) {
  const { http } = useKibana().services;
  const { authorizedToReadRuleType } = useAuthorizedToReadRuleType();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ruleId = alert.fields[ALERT_RULE_UUID];
  const ruleName = alert.fields[ALERT_RULE_NAME];
  const ruleLink = http.basePath.prepend(paths.observability.ruleDetails(ruleId));
  const ruleTypeBreached = getAlertSubtitle(alert.fields[ALERT_RULE_CATEGORY]);
  const canReadAlertRule = authorizedToReadRuleType(
    alert.fields[ALERT_RULE_TYPE_ID],
    alert.fields[ALERT_RULE_CONSUMER]
  );

  const isRuleUnavailable = ruleStatus === 'deleted' || ruleStatus === 'disabled';
  const showRuleLink = canReadAlertRule && ruleId && !isRuleUnavailable;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {ruleTypeBreached}
          </EuiText>
        </EuiFlexItem>
        {showRuleLink && (
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink data-test-subj="o11yAlertRuleLink" href={ruleLink}>
                {i18n.translate('xpack.observability.pages.alertDetails.pageTitle.viewRule', {
                  defaultMessage: 'View rule',
                })}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        )}
        {isRuleUnavailable && canReadAlertRule && (
          <>
            {ruleName && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" data-test-subj="alertSubtitleRuleName">
                  {i18n.translate('xpack.observability.pages.alertDetails.pageTitle.ruleLabel', {
                    defaultMessage: 'Rule:',
                  })}
                  &nbsp;
                  {ruleStatus === 'deleted' ? (
                    <EuiLink
                      data-test-subj="alertSubtitleRuleNameLink"
                      onClick={() => setIsModalOpen(true)}
                    >
                      {ruleName}
                    </EuiLink>
                  ) : (
                    <EuiLink data-test-subj="alertSubtitleRuleNameLink" href={ruleLink}>
                      {ruleName}
                    </EuiLink>
                  )}
                </EuiText>
              </EuiFlexItem>
            )}
            {ruleId && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued" data-test-subj="alertSubtitleRuleId">
                  {i18n.translate('xpack.observability.pages.alertDetails.pageTitle.ruleIdLabel', {
                    defaultMessage: 'Rule ID: {ruleId}',
                    values: { ruleId },
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning" data-test-subj="alertSubtitleRuleUnavailableBadge">
                <EuiIcon type="warning" size="s" aria-hidden={true} />
                &nbsp;
                {i18n.translate(
                  'xpack.observability.pages.alertDetails.pageTitle.ruleUnavailableBadge',
                  { defaultMessage: 'The rule was deleted or disabled!' }
                )}
              </EuiBadge>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      {isModalOpen && <RuleDeletedModal ruleId={ruleId} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
