/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared/src/alert_lifecycle_status_badge';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AlertStatus } from '@kbn/rule-data-utils';
import { ALERT_DURATION, ALERT_FLAPPING, TIMESTAMP, TAGS } from '@kbn/rule-data-utils';
import { css } from '@emotion/react';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { asDuration } from '../../../../common/utils/formatters';
import type { TopAlert } from '../../../typings/alerts';
import { CaseLinks } from './case_links';

export interface StatusBarProps {
  alert: TopAlert | null;
  alertStatus?: AlertStatus;
}

export function StatusBar({ alert, alertStatus }: StatusBarProps) {
  const { euiTheme } = useEuiTheme();
  const dateFormat = useUiSetting<string>('dateFormat');

  const tags = alert?.fields[TAGS];
  const workflowTags = alert?.fields['kibana.alert.workflow_tags'];

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
      <CaseLinks alert={alert} />
      {tags && tags.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs">
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.observability.pages.alertDetails.pageTitle.tags"
                defaultMessage="Tags:"
              />
            </EuiText>
            <TagsList tags={tags} ignoreEmpty color="default" />
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      {workflowTags && workflowTags.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs">
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.observability.pages.alertDetails.pageTitle.workflowTags"
                defaultMessage="Workflow tags:"
              />
            </EuiText>
            <TagsList tags={workflowTags} ignoreEmpty color="default" />
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false} css={{ minWidth: 100 }}>
        <EuiFlexGroup gutterSize="xs">
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.pageTitle.triggered"
              defaultMessage="Triggered:"
            />
          </EuiText>
          <EuiToolTip content={moment(Number(alert.start)).format(dateFormat)}>
            <EuiText
              tabIndex={0}
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              size="s"
            >
              {moment(Number(alert.start)).locale(i18n.getLocale()).fromNow()}
            </EuiText>
          </EuiToolTip>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ minWidth: 120 }}>
        <EuiFlexGroup gutterSize="xs">
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.pageTitle.duration"
              defaultMessage="Duration:"
            />
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
      <EuiFlexItem grow={false} css={{ minWidth: 240 }}>
        <EuiFlexGroup gutterSize="xs">
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.pageTitle.lastStatusUpdate"
              defaultMessage="Last status update:"
            />
          </EuiText>
          <EuiToolTip content={moment(alert.fields[TIMESTAMP]).format(dateFormat)}>
            <EuiText
              tabIndex={0}
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              size="s"
            >
              {moment(alert.fields[TIMESTAMP]?.toString()).locale(i18n.getLocale()).fromNow()}
            </EuiText>
          </EuiToolTip>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
