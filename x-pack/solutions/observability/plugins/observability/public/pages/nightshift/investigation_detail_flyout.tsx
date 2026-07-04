/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiListGroup,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationFixture } from './investigation_fixtures';

const STATUS_LABEL = i18n.translate('xpack.observability.nightshift.investigationFlyout.status', {
  defaultMessage: 'Status',
});
const GOAL_LABEL = i18n.translate('xpack.observability.nightshift.investigationFlyout.goal', {
  defaultMessage: 'Goal',
});
const CONCLUSION_LABEL = i18n.translate(
  'xpack.observability.nightshift.investigationFlyout.conclusion',
  { defaultMessage: 'Conclusion' }
);
const CONTRIBUTING_FACTORS_LABEL = i18n.translate(
  'xpack.observability.nightshift.investigationFlyout.contributingFactors',
  { defaultMessage: 'Contributing factors' }
);
const MECHANISM_LABEL = i18n.translate(
  'xpack.observability.nightshift.investigationFlyout.mechanism',
  { defaultMessage: 'Mechanism' }
);
const ALTERNATIVES_RULED_OUT_LABEL = i18n.translate(
  'xpack.observability.nightshift.investigationFlyout.alternativesRuledOut',
  { defaultMessage: 'Alternatives ruled out' }
);
const RECOMMENDED_NEXT_STEPS_LABEL = i18n.translate(
  'xpack.observability.nightshift.investigationFlyout.recommendedNextSteps',
  { defaultMessage: 'Recommended next steps' }
);
const EXPLAIN_THIS_INVESTIGATION_LABEL = i18n.translate(
  'xpack.observability.nightshift.investigationFlyout.explainThisInvestigation',
  { defaultMessage: 'Explain this investigation' }
);
const VIEW_INVESTIGATION_LABEL = i18n.translate(
  'xpack.observability.nightshift.investigationFlyout.viewInvestigation',
  { defaultMessage: 'View investigation' }
);
const LIVE_AGENT_NOT_AVAILABLE_LABEL = i18n.translate(
  'xpack.observability.nightshift.investigationFlyout.liveAgentNotAvailable',
  {
    defaultMessage:
      'The live agent reasoning view is not part of this preview — this button is for layout reference only.',
  }
);

export interface InvestigationDetailFlyoutProps {
  investigation: InvestigationFixture;
  onClose: () => void;
}

export function InvestigationDetailFlyout({
  investigation,
  onClose,
}: InvestigationDetailFlyoutProps) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'investigationDetailFlyout' });
  const isComplete = investigation.status === 'complete';

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId} size="s" type="overlay">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{investigation.title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="xs" color="subdued">
          {STATUS_LABEL}
        </EuiText>
        <EuiBadge color={isComplete ? 'success' : 'primary'}>
          {isComplete
            ? i18n.translate('xpack.observability.nightshift.investigationFlyout.complete', {
                defaultMessage: 'Complete',
              })
            : i18n.translate(
                'xpack.observability.nightshift.investigationFlyout.investigating',
                {
                  defaultMessage: 'Investigating · {n} {n, plural, one {hypothesis} other {hypotheses}}',
                  values: { n: investigation.hypothesesCount },
                }
              )}
        </EuiBadge>

        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h4>{GOAL_LABEL}</h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <p>{investigation.goal}</p>
        </EuiText>

        {isComplete && investigation.conclusion && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h4>{CONCLUSION_LABEL}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <p>{investigation.conclusion}</p>
            </EuiText>
          </>
        )}

        {isComplete && investigation.contributingFactors && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h4>{CONTRIBUTING_FACTORS_LABEL}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <p>{investigation.contributingFactors}</p>
            </EuiText>
          </>
        )}

        {isComplete && investigation.mechanism && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h4>{MECHANISM_LABEL}</h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <p>{investigation.mechanism}</p>
            </EuiText>
          </>
        )}

        {isComplete &&
          investigation.alternativesRuledOut &&
          investigation.alternativesRuledOut.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiTitle size="xxs">
                <h4>{ALTERNATIVES_RULED_OUT_LABEL}</h4>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiFlexGroup direction="column" gutterSize="s">
                {investigation.alternativesRuledOut.map((alt, idx) => (
                  <EuiFlexItem grow={false} key={idx}>
                    <EuiPanel color="subdued" paddingSize="s" hasBorder={false}>
                      <EuiText size="s">
                        <strong>{alt.candidate}</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {alt.reason}
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </>
          )}

        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h4>{RECOMMENDED_NEXT_STEPS_LABEL}</h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiPanel color="subdued" paddingSize="s" hasBorder={false}>
          <EuiListGroup
            listItems={investigation.recommendedNextSteps.map((step, idx) => ({
              label: `${idx + 1}. ${step}`,
              size: 's' as const,
              wrapText: true,
            }))}
            bordered={false}
            maxWidth={false}
          />
        </EuiPanel>

        <EuiSpacer size="m" />
        <EuiToolTip content={LIVE_AGENT_NOT_AVAILABLE_LABEL}>
          <EuiButton fill isDisabled>
            {isComplete ? EXPLAIN_THIS_INVESTIGATION_LABEL : VIEW_INVESTIGATION_LABEL}
          </EuiButton>
        </EuiToolTip>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
