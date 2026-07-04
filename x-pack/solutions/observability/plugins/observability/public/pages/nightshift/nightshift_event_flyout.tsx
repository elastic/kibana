/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiListGroup,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { Detection, Feature, SigEvent, SigEventStatus } from '@kbn/streams-schema';
import { RootCauseCard } from '@kbn/nightshift';
import { KiDetailFlyout } from './ki_detail_flyout';
import { SymptomDetailFlyout, getTrendLabel } from './symptom_detail_flyout';
import { InvestigationDetailFlyout } from './investigation_detail_flyout';
import { getDetectionIdsForEvent } from './use_fetch_detections';
import { getInvestigationsForEvent } from './investigation_fixtures';

/*
 * v0-only flyout for the Nightshift landing page. Deliberately does NOT
 * reuse streams_app's `SigEventFlyout` — that component isn't exported
 * across the plugin boundary, and its "Lifecycle" section (joining across
 * Discovery/Detection data streams) is explicitly out of scope for v0
 * per dev/nightshift-v0-landing-page/STATUS.md.
 *
 * Status label/color mapping is duplicated (not imported) from
 * streams_app's `shared/status_display.ts` / `constants.ts` for the same
 * cross-plugin-boundary reason as RootCauseCard — see that file's own
 * header comment for the full explanation.
 *
 * Criticality is intentionally not shown anywhere in this flyout — Kate
 * Sosedova's latest prototype never displays it either, confirming the
 * 2026-07-02 design decision to drop it, not just deprioritize it.
 */

const STATUS_LABELS: Record<SigEventStatus, string> = {
  promoted: i18n.translate('xpack.observability.nightshift.status.open', {
    defaultMessage: 'Need action',
  }),
  acknowledged: i18n.translate('xpack.observability.nightshift.status.acknowledged', {
    defaultMessage: 'Need action',
  }),
  resolved: i18n.translate('xpack.observability.nightshift.status.resolved', {
    defaultMessage: 'Resolved',
  }),
  demoted: i18n.translate('xpack.observability.nightshift.status.demoted', {
    defaultMessage: 'Need action',
  }),
};

const STATUS_COLORS: Record<SigEventStatus, string> = {
  promoted: 'danger',
  acknowledged: 'danger',
  resolved: 'success',
  demoted: 'danger',
};

const STATUS_LABEL = i18n.translate('xpack.observability.nightshift.flyout.statusLabel', {
  defaultMessage: 'Status',
});
const IMPACT_TITLE = i18n.translate('xpack.observability.nightshift.flyout.impactTitle', {
  defaultMessage: 'Impact',
});
const SUMMARY_TITLE = i18n.translate('xpack.observability.nightshift.flyout.summaryTitle', {
  defaultMessage: 'Summary',
});
const SYMPTOMS_TITLE = i18n.translate('xpack.observability.nightshift.flyout.symptomsTitle', {
  defaultMessage: 'Symptoms',
});
const INVESTIGATIONS_TITLE = i18n.translate(
  'xpack.observability.nightshift.flyout.investigationsTitle',
  { defaultMessage: 'Investigations' }
);
const RECOMMENDED_NEXT_STEPS_TITLE = i18n.translate(
  'xpack.observability.nightshift.flyout.recommendedNextStepsTitle',
  { defaultMessage: 'Recommended next steps' }
);

type SecondaryFlyout =
  | { type: 'ki'; id: string }
  | { type: 'symptom'; id: string }
  | { type: 'investigation'; id: string }
  | null;

export interface NightshiftEventFlyoutProps {
  event: SigEvent;
  onClose: () => void;
  onOpenInDiscoverEsql: (esql: string) => void;
  featuresById: Record<string, Feature>;
  detectionsById: Record<string, Detection>;
}

export function NightshiftEventFlyout({
  event,
  onClose,
  onOpenInDiscoverEsql,
  featuresById,
  detectionsById,
}: NightshiftEventFlyoutProps) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'nightshiftEventFlyout' });
  const [secondaryFlyout, setSecondaryFlyout] = useState<SecondaryFlyout>(null);

  const detectionIds = getDetectionIdsForEvent(event.event_id);
  const symptoms = detectionIds.map((id) => detectionsById[id]).filter(Boolean);
  const investigations = getInvestigationsForEvent(event.event_id);

  return (
    <>
      <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId} size="40%" type="overlay">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={flyoutTitleId}>{event.title}</h2>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedRelative value={event['@timestamp']} />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            {STATUS_LABEL}
          </EuiText>
          <EuiBadge color={STATUS_COLORS[event.status]}>{STATUS_LABELS[event.status]}</EuiBadge>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiFlexGroup direction="column" gutterSize="m">
            {event.cause_kis && event.cause_kis.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>{IMPACT_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                  {event.cause_kis.map((ki, idx) => {
                    const feature = ki.name ? featuresById[ki.name] : undefined;
                    const badge = (
                      <EuiBadge
                        color="hollow"
                        onClick={feature ? () => setSecondaryFlyout({ type: 'ki', id: feature.id }) : undefined}
                        onClickAriaLabel={feature?.title ?? ki.name ?? ''}
                      >
                        {ki.name || '-'}
                        {ki.stream_name ? ` (${ki.stream_name})` : ''}
                      </EuiBadge>
                    );
                    return (
                      <EuiFlexItem grow={false} key={`${ki.name}-${idx}`}>
                        {feature ? (
                          <EuiToolTip content={feature.subtype ?? feature.type}>{badge}</EuiToolTip>
                        ) : (
                          badge
                        )}
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}

            {event.summary && (
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>{SUMMARY_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiText size="s">
                  <p>{event.summary}</p>
                </EuiText>
              </EuiFlexItem>
            )}

            <EuiFlexItem grow={false}>
              <RootCauseCard
                event={event}
                onOpenInDiscover={(evidence) =>
                  evidence.esql_query && onOpenInDiscoverEsql(evidence.esql_query)
                }
              />
            </EuiFlexItem>

            {symptoms.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiHorizontalRule margin="none" />
                <EuiSpacer size="s" />
                <EuiTitle size="xs">
                  <h3>{SYMPTOMS_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiFlexGroup direction="column" gutterSize="s">
                  {symptoms.map((symptom) => {
                    const trend = getTrendLabel(symptom.detection_evidence?.change_point_type);
                    return (
                      <EuiFlexItem grow={false} key={symptom.detection_id}>
                        <EuiPanel
                          hasBorder
                          paddingSize="s"
                          onClick={() =>
                            setSecondaryFlyout({ type: 'symptom', id: symptom.detection_id })
                          }
                          css={{ cursor: 'pointer' }}
                        >
                          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                            <EuiFlexItem>
                              <EuiText size="s" color="accent">
                                <strong>{symptom.rule_name}</strong>
                              </EuiText>
                              <EuiText size="xs" color="subdued">
                                <FormattedRelative value={symptom['@timestamp']} />
                              </EuiText>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiBadge color={trend.color}>{trend.label}</EuiBadge>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiPanel>
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}

            {investigations.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiHorizontalRule margin="none" />
                <EuiSpacer size="s" />
                <EuiTitle size="xs">
                  <h3>{INVESTIGATIONS_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiFlexGroup direction="column" gutterSize="s">
                  {investigations.map((investigation) => (
                    <EuiFlexItem grow={false} key={investigation.id}>
                      <EuiPanel
                        hasBorder
                        paddingSize="s"
                        onClick={() =>
                          setSecondaryFlyout({ type: 'investigation', id: investigation.id })
                        }
                        css={{ cursor: 'pointer' }}
                      >
                        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                          <EuiFlexItem>
                            <EuiText size="s" color="accent">
                              <strong>{investigation.title}</strong>
                            </EuiText>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiBadge color={investigation.status === 'complete' ? 'success' : 'primary'}>
                              {investigation.status === 'complete'
                                ? i18n.translate(
                                    'xpack.observability.nightshift.flyout.investigationComplete',
                                    { defaultMessage: 'Complete' }
                                  )
                                : i18n.translate(
                                    'xpack.observability.nightshift.flyout.investigationInProgress',
                                    {
                                      defaultMessage:
                                        'Investigating · {n} {n, plural, one {hypothesis} other {hypotheses}}',
                                      values: { n: investigation.hypothesesCount },
                                    }
                                  )}
                            </EuiBadge>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}

            {event.recommendations && event.recommendations.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiHorizontalRule margin="none" />
                <EuiSpacer size="s" />
                <EuiTitle size="xs">
                  <h3>{RECOMMENDED_NEXT_STEPS_TITLE}</h3>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiPanel color="subdued" paddingSize="s" hasBorder={false}>
                  <EuiListGroup
                    listItems={event.recommendations.map((rec, idx) => ({
                      label: `${idx + 1}. ${rec}`,
                      size: 's' as const,
                      wrapText: true,
                    }))}
                    bordered={false}
                    maxWidth={false}
                  />
                </EuiPanel>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </EuiFlyout>

      {secondaryFlyout?.type === 'ki' && featuresById[secondaryFlyout.id] && (
        <KiDetailFlyout
          feature={featuresById[secondaryFlyout.id]}
          onClose={() => setSecondaryFlyout(null)}
        />
      )}
      {secondaryFlyout?.type === 'symptom' && detectionsById[secondaryFlyout.id] && (
        <SymptomDetailFlyout
          detection={detectionsById[secondaryFlyout.id]}
          onClose={() => setSecondaryFlyout(null)}
          onOpenInDiscover={onOpenInDiscoverEsql}
        />
      )}
      {secondaryFlyout?.type === 'investigation' &&
        investigations.find((inv) => inv.id === secondaryFlyout.id) && (
          <InvestigationDetailFlyout
            investigation={investigations.find((inv) => inv.id === secondaryFlyout.id)!}
            onClose={() => setSecondaryFlyout(null)}
          />
        )}
    </>
  );
}
