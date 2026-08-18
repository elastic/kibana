/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcPortfolioSummary } from '../../../../common/api/types';

export const RiskBanner = ({
  summary,
  onShowAtRisk,
}: {
  summary: SdlcPortfolioSummary;
  onShowAtRisk: () => void;
}) => {
  if (summary.atRiskEpicCount === 0 && summary.ticketsWithoutPrCount === 0) {
    return null;
  }

  return (
    <EuiCallOut
      announceOnMount
      title={
        <FormattedMessage
          id="xpack.sdlcIntel.executive.riskBanner.title"
          defaultMessage="Portfolio risks detected"
        />
      }
      color="warning"
      iconType="alert"
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        {summary.atRiskEpicCount > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.sdlcIntel.executive.riskBanner.atRiskEpics"
                defaultMessage="{count, plural, one {# epic at risk} other {# epics at risk}} — coverage below 30%"
                values={{ count: summary.atRiskEpicCount }}
              />
            </EuiText>
          </EuiFlexItem>
        ) : null}
        {summary.ticketsWithoutPrCount > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.sdlcIntel.executive.riskBanner.ticketsWithoutPr"
                defaultMessage="{count, plural, one {# ticket} other {# tickets}} without linked PRs"
                values={{ count: summary.ticketsWithoutPrCount }}
              />
            </EuiText>
          </EuiFlexItem>
        ) : null}
        {summary.atRiskEpicCount > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={onShowAtRisk}>
              <FormattedMessage
                id="xpack.sdlcIntel.executive.riskBanner.showAtRisk"
                defaultMessage="Show at-risk only"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
