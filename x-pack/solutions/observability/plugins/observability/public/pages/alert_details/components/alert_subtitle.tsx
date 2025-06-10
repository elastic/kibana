/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiLink, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { ALERT_RULE_UUID, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { TopAlert } from '../../../typings/alerts';
import { paths } from '../../../../common/locators/paths';
import { useKibana } from '../../../utils/kibana_react';

export interface AlertSubtitleProps {
  alert: TopAlert;
}

export function AlertSubtitle({ alert }: AlertSubtitleProps) {
  const { http } = useKibana().services;

  const { euiTheme } = useEuiTheme();

  const ruleId = alert.fields[ALERT_RULE_UUID];
  const ruleLink = http.basePath.prepend(paths.observability.ruleDetails(ruleId));

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.observability.pages.alertDetails.pageTitle.ruleName"
          defaultMessage="Rule"
        />
        :&nbsp;
      </EuiText>
      <EuiToolTip position="top" content={alert.fields[ALERT_RULE_NAME]}>
        <EuiText
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
          size="s"
        >
          <EuiLink
            data-test-subj="o11yAlertRuleLink"
            href={ruleLink}
            css={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px',
              display: 'flow',
              alignItems: 'center',
            }}
          >
            {alert.fields[ALERT_RULE_NAME]}
          </EuiLink>
        </EuiText>
      </EuiToolTip>
    </EuiFlexGroup>
  );
}
