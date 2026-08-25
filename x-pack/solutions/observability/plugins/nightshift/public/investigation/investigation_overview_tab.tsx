/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  EvidenceList,
  buildEvidenceDiscoverParams,
  buildCodeReferenceUrl,
  formatCodeReferenceLabel,
  formatCodeReferenceDetail,
  type InvestigationDiscoverParams,
} from '@kbn/investigation-output';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { InvestigationHypothesis, InvestigationBlindSpot, InvestigationRecommendation, InvestigationEvidence } from '@kbn/significant-events-schema';
import type { ConversationTemplateTabRenderProps } from '@kbn/agent-builder-browser';
import { BlindSpotsTable } from './blind_spots_table';
import { InvestigationFormattedText } from './investigation_formatted_text';
import { useKibana } from '../hooks/use_kibana';
import { FlyoutSectionTitle } from '../common/flyout_section_title';

const STATUS_COLORS: Record<string, string> = {
  open: 'warning',
  in_progress: 'primary',
  resolved: 'success',
  false_positive: 'default',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'default',
};

const HYPOTHESIS_STATUS_LABELS: Record<string, string> = {
  confirmed: i18n.translate('xpack.nightshift.investigation.overview.hypothesisConfirmed', { defaultMessage: 'Confirmed' }),
  dismissed: i18n.translate('xpack.nightshift.investigation.overview.hypothesisDismissed', { defaultMessage: 'Dismissed' }),
  investigating: i18n.translate('xpack.nightshift.investigation.overview.hypothesisInvestigating', { defaultMessage: 'Investigating' }),
};

const HYPOTHESIS_STATUS_COLORS: Record<string, string> = {
  confirmed: 'success',
  dismissed: 'default',
  investigating: 'primary',
};

function HypothesisItem({
  hypothesis,
  getQueryHref,
}: {
  hypothesis: InvestigationHypothesis;
  getQueryHref: (params: InvestigationDiscoverParams) => string | undefined;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const hasEvidence = (hypothesis.evidence?.length ?? 0) > 0;

  return (
    <div
      css={{
        padding: euiTheme.size.m,
        borderBottom: euiTheme.border.thin,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow>
          <InvestigationFormattedText text={hypothesis.candidate} bold />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={HYPOTHESIS_STATUS_COLORS[hypothesis.status] ?? 'hollow'}>
            {HYPOTHESIS_STATUS_LABELS[hypothesis.status] ?? hypothesis.status}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={hypothesis.confidence >= 0.9 ? 'success' : 'hollow'}>
            {`${Math.round(hypothesis.confidence * 100)}%`}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      {hypothesis.reason && (
        <>
          <EuiSpacer size="xs" />
          <InvestigationFormattedText text={hypothesis.reason} />
        </>
      )}
      {hasEvidence && (
        <>
          <EuiSpacer size="xs" />
          <EvidenceList evidence={hypothesis.evidence!} getQueryHref={getQueryHref} />
        </>
      )}
    </div>
  );
}

function RecommendationItem({ recommendation }: { recommendation: InvestigationRecommendation }): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <div css={{ padding: euiTheme.size.m, borderBottom: euiTheme.border.thin, '&:last-child': { borderBottom: 'none' } }}>
      <InvestigationFormattedText text={recommendation.title} bold />
      {recommendation.description && (
        <>
          <EuiSpacer size="xs" />
          <InvestigationFormattedText text={recommendation.description} />
        </>
      )}
      {recommendation.code && (
        <>
          <EuiSpacer size="xs" />
          <EuiCodeBlock language="shell" isCopyable fontSize="s">
            {recommendation.code}
          </EuiCodeBlock>
        </>
      )}
    </div>
  );
}

export const InvestigationOverviewTab: React.FC<ConversationTemplateTabRenderProps> = ({
  conversation,
}) => {
  const { share } = useKibana().services;
  const metadata = conversation.metadata ?? {};

  const summary = metadata.summary as string | undefined;
  const conclusion = metadata.conclusion as string | undefined;
  const status = metadata.status as string | undefined;
  const severity = metadata.severity as string | undefined;
  const affectedServices = metadata.affected_services as string[] | undefined;
  const hypotheses = metadata.hypotheses as InvestigationHypothesis[] | undefined;
  const recommendations = metadata.recommendations as InvestigationRecommendation[] | undefined;
  const blindSpots = metadata.blind_spots as InvestigationBlindSpot[] | undefined;

  const hasContent = summary || conclusion || status || severity || (affectedServices?.length ?? 0) > 0 ||
    (hypotheses?.length ?? 0) > 0 || (recommendations?.length ?? 0) > 0 || (blindSpots?.length ?? 0) > 0;

  const discoverLocator = share?.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const getQueryHref = useMemo(
    () => (params: InvestigationDiscoverParams) => discoverLocator?.getRedirectUrl(params),
    [discoverLocator]
  );

  const allEvidence = useMemo(
    () => (hypotheses ?? []).flatMap((h) => h.evidence ?? []) as InvestigationEvidence[],
    [hypotheses]
  );

  const keyDiscoverLinks = useMemo(
    () =>
      allEvidence.flatMap((ev) => {
        const params = buildEvidenceDiscoverParams(ev);
        if (!params) return [];
        const href = getQueryHref(params);
        if (!href) return [];
        return [{ href, label: ev.description }];
      }),
    [allEvidence, getQueryHref]
  );

  const keyCodeLinks = useMemo(
    () =>
      allEvidence.flatMap((ev) => {
        if (!ev.code) return [];
        const href = buildCodeReferenceUrl(ev.code);
        if (!href) return [];
        return [{
          href,
          label: formatCodeReferenceLabel(ev.code),
          tooltip: formatCodeReferenceDetail(ev.code),
        }];
      }),
    [allEvidence]
  );

  if (!hasContent) {
    return (
      <EuiText color="subdued" size="s">
        <p>
          {i18n.translate('xpack.nightshift.investigation.overview.empty', {
            defaultMessage: 'The investigation agent has not written structured metadata yet.',
          })}
        </p>
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      {(status || severity) && (
        <EuiFlexItem grow={false}>
          <EuiBadgeGroup gutterSize="xs">
            {status && (
              <EuiBadge color={STATUS_COLORS[status] ?? 'default'}>
                {status.replace('_', ' ')}
              </EuiBadge>
            )}
            {severity && (
              <EuiBadge color={SEVERITY_COLORS[severity] ?? 'default'}>
                {severity}
              </EuiBadge>
            )}
          </EuiBadgeGroup>
        </EuiFlexItem>
      )}

      {(summary || conclusion) && (
        <EuiFlexItem grow={false}>
          <FlyoutSectionTitle>
            {i18n.translate('xpack.nightshift.investigation.overview.conclusionTitle', {
              defaultMessage: 'Conclusion',
            })}
          </FlyoutSectionTitle>
          <EuiSpacer size="s" />
          {conclusion ? (
            <InvestigationFormattedText text={conclusion} />
          ) : (
            <InvestigationFormattedText text={summary!} />
          )}
        </EuiFlexItem>
      )}

      {(affectedServices?.length ?? 0) > 0 && (
        <EuiFlexItem grow={false}>
          <FlyoutSectionTitle>
            {i18n.translate('xpack.nightshift.investigation.overview.affectedServicesTitle', {
              defaultMessage: 'Affected services',
            })}
          </FlyoutSectionTitle>
          <EuiSpacer size="s" />
          <EuiBadgeGroup gutterSize="xs">
            {affectedServices!.map((svc) => (
              <EuiBadge key={svc}>{svc}</EuiBadge>
            ))}
          </EuiBadgeGroup>
        </EuiFlexItem>
      )}

      {(keyDiscoverLinks.length > 0 || keyCodeLinks.length > 0) && (
        <EuiFlexItem grow={false}>
          <FlyoutSectionTitle>
            {i18n.translate('xpack.nightshift.investigation.overview.keyEvidenceTitle', {
              defaultMessage: 'Key Evidence',
            })}
          </FlyoutSectionTitle>
          <EuiSpacer size="s" />
          <EuiBadgeGroup gutterSize="xs">
            {keyDiscoverLinks.map((link, i) => (
              <EuiBadge
                key={`discover-${i}`}
                color="hollow"
                iconType="discoverApp"
                href={link.href}
                target="_blank"
                title={link.label}
                data-test-subj="nightshiftKeyEvidenceDiscoverLink"
              >
                {link.label.length > 50 ? `${link.label.slice(0, 47)}…` : link.label}
              </EuiBadge>
            ))}
            {keyCodeLinks.map((link, i) => (
              <EuiToolTip key={`code-${i}`} content={link.tooltip}>
                <EuiBadge
                  color="hollow"
                  iconType="editorCodeBlock"
                  href={link.href}
                  target="_blank"
                  data-test-subj="nightshiftKeyEvidenceCodeLink"
                >
                  {link.label}
                </EuiBadge>
              </EuiToolTip>
            ))}
          </EuiBadgeGroup>
        </EuiFlexItem>
      )}

      {(recommendations?.length ?? 0) > 0 && (
        <EuiFlexItem grow={false}>
          <FlyoutSectionTitle>
            {i18n.translate('xpack.nightshift.investigation.overview.recommendationsTitle', {
              defaultMessage: 'Recommendations',
            })}
          </FlyoutSectionTitle>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="none">
            {recommendations!.map((rec, i) => (
              <RecommendationItem key={i} recommendation={rec} />
            ))}
          </EuiPanel>
        </EuiFlexItem>
      )}

      {(hypotheses?.length ?? 0) > 0 && (
        <EuiFlexItem grow={false}>
          <FlyoutSectionTitle>
            {i18n.translate('xpack.nightshift.investigation.overview.hypothesesTitle', {
              defaultMessage: 'Hypotheses',
            })}
          </FlyoutSectionTitle>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="none">
            {hypotheses!.map((h, i) => (
              <HypothesisItem key={i} hypothesis={h} getQueryHref={getQueryHref} />
            ))}
          </EuiPanel>
        </EuiFlexItem>
      )}

      {(blindSpots?.length ?? 0) > 0 && (
        <EuiFlexItem grow={false}>
          <BlindSpotsTable
            items={blindSpots!}
            showTitle
            testSubj="nightshiftInvestigationOverviewBlindSpots"
            chatAttachmentIdPrefix="nightshift-overview-blind-spot"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
