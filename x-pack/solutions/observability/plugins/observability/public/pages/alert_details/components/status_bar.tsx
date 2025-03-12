/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, useEuiTheme, EuiToolTip } from '@elastic/eui';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared/src/alert_lifecycle_status_badge';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  AlertStatus,
  ALERT_DURATION,
  ALERT_FLAPPING,
  TIMESTAMP,
  TAGS,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
} from '@kbn/rule-data-utils';
import { css } from '@emotion/react';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../../utils/kibana_react';
import { paths } from '../../../../common/locators/paths';
import { asDuration } from '../../../../common/utils/formatters';
import { TopAlert } from '../../../typings/alerts';

export interface StatusBarProps {
  alert: TopAlert | null;
  alertStatus?: AlertStatus;
}

export function StatusBar({ alert, alertStatus }: StatusBarProps) {
  const { http } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const tags = alert?.fields[TAGS];
  const ruleName = alert?.fields[ALERT_RULE_NAME];
  const ruleId = alert?.fields[ALERT_RULE_UUID];
  const ruleLink = ruleId ? http.basePath.prepend(paths.observability.ruleDetails(ruleId)) : '';

  if (!alert) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="row"
      alignItems="center"
      gutterSize="m"
      data-test-subj="statusBar"
      wrap
    >
      <EuiFlexItem grow={false}>
        {alertStatus && (
          <AlertLifecycleStatusBadge
            alertStatus={alertStatus}
            flapping={alert.fields[ALERT_FLAPPING]}
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TagsList tags={tags} ignoreEmpty color="default" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
        <EuiFlexGroup gutterSize="none" alignItems="center">
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.pageTitle.ruleName"
              defaultMessage="Rule"
            />
            :&nbsp;
          </EuiText>
          <EuiToolTip position="top" content={ruleName}>
            <EuiText
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              size="s"
            >
              <EuiLink
                data-test-subj="o11yAlertRuleLink"
                href={ruleLink}
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '200px',
                  display: 'flow',
                  alignItems: 'center',
                }}
              >
                {ruleName}
              </EuiLink>
            </EuiText>
          </EuiToolTip>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
        <EuiFlexGroup gutterSize="none">
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.pageTitle.triggered"
              defaultMessage="Triggered"
            />
            :&nbsp;
          </EuiText>
          <EuiText
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
            size="s"
          >
            {moment(Number(alert.start)).locale(i18n.getLocale()).fromNow()}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 120 }}>
        <EuiFlexGroup gutterSize="none">
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.pageTitle.duration"
              defaultMessage="Duration"
            />
            :&nbsp;
          </EuiText>
          <EuiText
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
            size="s"
          >
            {asDuration(Number(alert.fields[ALERT_DURATION]))}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 240 }}>
        <EuiFlexGroup gutterSize="none">
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.pageTitle.lastStatusUpdate"
              defaultMessage="Last status update"
            />
            :&nbsp;
          </EuiText>
          <EuiText
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
            size="s"
          >
            {moment(alert.fields[TIMESTAMP]?.toString()).locale(i18n.getLocale()).fromNow()}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
