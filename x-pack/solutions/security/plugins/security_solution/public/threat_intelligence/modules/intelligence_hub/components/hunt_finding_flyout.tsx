/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { HuntFindingListItem } from './hunt_findings_panel';
import { stripReportIdSuffix } from './hunt_findings_panel';

interface Props {
  finding: HuntFindingListItem;
  isDeployed: boolean;
  isDeploying: boolean;
  deployedRuleId?: string;
  onClose: () => void;
  onDeployRule: (finding: HuntFindingListItem) => void;
  onInvestigate: (finding: HuntFindingListItem) => void;
  onOpenRule?: (ruleId: string) => void;
}

const titleCase = (value: string): string =>
  value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const getFindingTitle = (finding: HuntFindingListItem): string =>
  (finding.rule_name && stripReportIdSuffix(finding.rule_name, finding.report_id)) ||
  (finding.technique_name
    ? `${finding.technique_id}: ${finding.technique_name}`
    : finding.technique_id);

const WhyLine: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <EuiText size="s">
    <p>
      <strong>{label}</strong> {children}
    </p>
  </EuiText>
);

const HuntFindingFlyoutComponent: React.FC<Props> = ({
  finding,
  isDeployed,
  isDeploying,
  deployedRuleId,
  onClose,
  onDeployRule,
  onInvestigate,
  onOpenRule,
}) => {
  const { euiTheme } = useEuiTheme();
  const title = getFindingTitle(finding);
  const confidenceLabel =
    finding.confidence >= 0.75
      ? i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutConfidenceHigh',
          { defaultMessage: 'High' }
        )
      : finding.confidence >= 0.4
      ? i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutConfidenceMedium',
          { defaultMessage: 'Medium' }
        )
      : i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutConfidenceLow',
          { defaultMessage: 'Low' }
        );

  const statusNewBadgeCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseAccent ?? euiTheme.colors.backgroundBaseDanger,
    color: euiTheme.colors.accentText ?? euiTheme.colors.accent ?? euiTheme.colors.danger,
  });

  const statusDeployedBadgeCss = css({
    backgroundColor: euiTheme.colors.emptyShade,
    color: euiTheme.colors.success,
    border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.success}`,
  });

  const evidencePanelCss = css({
    backgroundColor: euiTheme.colors.backgroundBasePrimary,
    borderLeft: `${euiTheme.size.xs} solid ${euiTheme.colors.primary}`,
    borderRadius: euiTheme.border.radius.medium,
    padding: euiTheme.size.m,
  });

  const affectedBadgeCss = css({
    backgroundColor: euiTheme.colors.lightShade,
    color: euiTheme.colors.textParagraph,
  });

  const tagBadgeCss = css({
    backgroundColor: euiTheme.colors.lightShade,
    color: euiTheme.colors.textParagraph,
  });

  const eyebrowCss = css({
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  });

  const findingTimestamp = finding['@timestamp'];
  const affectedUsers = finding.affected_assets.users ?? [];
  const affectedHosts = finding.affected_assets.hosts ?? [];
  const envHits = finding.env_hits ?? 0;
  const entityChips = [...affectedUsers.slice(0, 3), ...affectedHosts.slice(0, 2)];
  const affectedList = [...affectedUsers, ...affectedHosts];

  const reportIngestedText = useMemo(() => {
    const metaParts = [finding.report_source, finding.report_category].filter(Boolean);
    const reportTitle = finding.report_title || finding.report_id;
    if (metaParts.length === 0) {
      return reportTitle;
    }
    return `${metaParts.join(' · ')} — ${reportTitle}`;
  }, [finding.report_category, finding.report_id, finding.report_source, finding.report_title]);

  const huntedAccountCount = affectedUsers.length + affectedHosts.length;
  const huntedHitsLabel =
    envHits > 0 && huntedAccountCount > 0
      ? i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutHuntedHitsAccounts',
          {
            defaultMessage:
              '{envHits, plural, one {# env hit} other {# env hits}}, behavior confirmed across {accountCount, plural, one {# account} other {# accounts}}',
            values: { envHits, accountCount: huntedAccountCount },
          }
        )
      : envHits > 0
      ? i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutHuntedHitsOnly',
          {
            defaultMessage: '{envHits, plural, one {# env hit} other {# env hits}}',
            values: { envHits },
          }
        )
      : finding.hypothesis_rationale;

  const ruleTags = useMemo(() => {
    const tags: string[] = [];
    if (finding.report_category) {
      tags.push(finding.report_category);
    }
    if (finding.report_source) {
      const sourceToken = finding.report_source.split(/\s+/)[0];
      if (sourceToken && !tags.includes(sourceToken)) {
        tags.push(sourceToken);
      }
    }
    if (finding.technique_id) {
      tags.push(finding.technique_id);
    }
    return tags;
  }, [finding.report_category, finding.report_source, finding.technique_id]);

  const handleDeploy = useCallback(() => {
    if (isDeployed && deployedRuleId && onOpenRule) {
      onOpenRule(deployedRuleId);
      return;
    }
    onDeployRule(finding);
  }, [deployedRuleId, finding, isDeployed, onDeployRule, onOpenRule]);

  const handleInvestigate = useCallback(() => {
    onInvestigate(finding);
  }, [finding, onInvestigate]);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      ownFocus
      aria-labelledby="threatIntelHuntFindingFlyoutTitle"
      data-test-subj="threatIntelHuntFindingFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiText size="xs" color="subdued" css={eyebrowCss}>
          <strong>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutEyebrow',
              { defaultMessage: 'Hunt finding' }
            )}
          </strong>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiTitle size="s">
          <h2 id="threatIntelHuntFindingFlyoutTitle">{title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">{confidenceLabel}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isDeployed ? (
              <EuiBadge css={statusDeployedBadgeCss}>
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutStatusDeployed',
                  { defaultMessage: 'Deployed' }
                )}
              </EuiBadge>
            ) : (
              <EuiBadge css={statusNewBadgeCss}>
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutStatusNew',
                  { defaultMessage: 'New' }
                )}
              </EuiBadge>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="threatIntelHuntFindingFlyoutFoundBadge">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutFoundPrefix',
                { defaultMessage: 'Found' }
              )}{' '}
              <FormattedRelative value={new Date(finding['@timestamp'])} />
            </EuiBadge>
          </EuiFlexItem>
          {finding.tier != null && finding.tier !== '' ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutHuntTier',
                  {
                    defaultMessage: 'Hunt: Tier {tier}',
                    values: { tier: finding.tier },
                  }
                )}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText size="s">
          <h3>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutWhyTitle',
              { defaultMessage: 'Why this finding' }
            )}
          </h3>
        </EuiText>
        <EuiSpacer size="s" />
        <WhyLine
          label={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutReportIngestedLabel',
            { defaultMessage: 'Report ingested:' }
          )}
        >
          {reportIngestedText}
        </WhyLine>
        <WhyLine
          label={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutHypothesisLabel',
            { defaultMessage: 'Hypothesis:' }
          )}
        >
          {finding.hypothesis}
        </WhyLine>
        <WhyLine
          label={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutHuntedLabel',
            { defaultMessage: 'Hunted:' }
          )}
        >
          {i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutHuntedPrefix',
            { defaultMessage: 'Hunted' }
          )}{' '}
          <FormattedRelative value={new Date(findingTimestamp)} />
          {huntedHitsLabel ? `: ${huntedHitsLabel}` : null}
        </WhyLine>

        <EuiHorizontalRule margin="m" />

        <EuiText size="s">
          <h3>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutSummaryTitle',
              { defaultMessage: 'Summary' }
            )}
          </h3>
          <p>{finding.hypothesis}</p>
        </EuiText>

        <EuiHorizontalRule margin="m" />

        <EuiText size="s">
          <h3>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutEvidenceTitle',
              { defaultMessage: 'Evidence' }
            )}
          </h3>
        </EuiText>
        <EuiSpacer size="s" />
        <div css={evidencePanelCss} data-test-subj="threatIntelHuntFindingFlyoutEvidence">
          <EuiText size="s">
            <p>{finding.hypothesis}</p>
          </EuiText>
        </div>
        {entityChips.length > 0 ? (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {entityChips.map((chip) => (
                <EuiFlexItem key={chip} grow={false}>
                  <EuiBadge color="hollow">{chip}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}

        <EuiHorizontalRule margin="m" />

        <EuiText size="s">
          <h3>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutAffectedTitle',
              { defaultMessage: 'Affected assets' }
            )}
          </h3>
        </EuiText>
        <EuiSpacer size="s" />
        {affectedList.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutAffectedNone',
              { defaultMessage: 'No affected assets recorded for this finding.' }
            )}
          </EuiText>
        ) : (
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            {affectedList.map((asset) => (
              <EuiFlexItem key={asset} grow={false}>
                <EuiBadge css={affectedBadgeCss}>
                  {'\u2022'} {asset}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}

        <EuiHorizontalRule margin="m" />

        <EuiText size="s">
          <h3>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutRuleTitle',
              { defaultMessage: 'Proposed detection rule' }
            )}
          </h3>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <strong>{finding.rule_name || title}</strong>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutRuleMeta',
            {
              defaultMessage:
                'ES|QL · Severity: {severity} · Risk score: {riskScore} · Confidence: {confidence}',
              values: {
                severity: titleCase(finding.severity),
                riskScore: finding.risk_score,
                confidence: confidenceLabel,
              },
            }
          )}
        </EuiText>
        {finding.proposed_esql_rule ? (
          <>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="sql" fontSize="s" paddingSize="s" isCopyable>
              {finding.proposed_esql_rule}
            </EuiCodeBlock>
          </>
        ) : null}
        {ruleTags.length > 0 ? (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {ruleTags.map((tag) => (
                <EuiFlexItem key={tag} grow={false}>
                  <EuiBadge css={tagBadgeCss}>{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="threatIntelHuntFindingFlyoutDismiss">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutDismiss',
                { defaultMessage: 'Dismiss' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill={false}
                  onClick={handleInvestigate}
                  data-test-subj="threatIntelHuntFindingFlyoutInvestigate"
                >
                  {i18n.translate(
                    'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutInvestigate',
                    { defaultMessage: 'Investigate' }
                  )}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  isDisabled={
                    (!isDeployed && !finding.proposed_esql_rule) || (isDeployed && !deployedRuleId)
                  }
                  isLoading={isDeploying}
                  onClick={handleDeploy}
                  data-test-subj="threatIntelHuntFindingFlyoutDeploy"
                >
                  {isDeployed
                    ? i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutOpenRule',
                        { defaultMessage: 'Open rule' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.huntFindingFlyoutDeployRule',
                        { defaultMessage: 'Deploy rule' }
                      )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const HuntFindingFlyout = React.memo(HuntFindingFlyoutComponent);
