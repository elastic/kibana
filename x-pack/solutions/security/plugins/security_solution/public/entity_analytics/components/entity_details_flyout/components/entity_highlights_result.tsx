/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import {
  replaceAnonymizedValuesWithOriginalValues,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type {
  EntitySummaryStalenessReason,
  EntitySummaryStalenessSignal,
} from '@kbn/entity-store/common';
import { getChangedStalenessSignals } from '@kbn/entity-store/common/entity_summary';
import { getUserDisplayName } from '@kbn/user-profile-components';
import moment from 'moment';
import { formatRiskScore } from '../../../common/utils';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import type { EntityHighlightsResponse } from '../types';

interface EntityHighlightsResultProps {
  assistantResult: {
    response: EntityHighlightsResponse | null;
    replacements: Replacements;
  } | null;
  showAnonymizedValues: boolean;
  generatedAt: number | null;
  generatedBy?: string;
  authorProfileUid?: string;
  stalenessReasons?: EntitySummaryStalenessReason[];
  onRefresh: () => void;
  canRegenerate?: boolean;
  isRefreshing?: boolean;
}

/**
 * Translated header label per staleness signal. Adding a signal to the shared registry
 * forces a new entry here via the `satisfies Record<...>` exhaustiveness check.
 */
const stalenessSignalLabel = (signal: EntitySummaryStalenessSignal): string => {
  const labels = {
    risk_score: i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.highlights.stalenessSignal.riskScore',
      { defaultMessage: 'Entity risk' }
    ),
  } satisfies Record<EntitySummaryStalenessSignal, string>;
  return labels[signal];
};

/**
 * Fully-translated detail line for a staleness change, composed from the structured
 * change data. The `switch` is exhaustive over the signal union: adding a signal without
 * a case here is a compile error (the function would no longer always return a string).
 */
const stalenessReasonMessage = (reason: EntitySummaryStalenessReason): string => {
  switch (reason.signal) {
    case 'risk_score':
      return i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.highlights.stalenessReason.riskScore',
        {
          defaultMessage: 'Risk score changed from {previousScore} to {currentScore}',
          values: {
            previousScore: formatRiskScore(reason.previousScore),
            currentScore: formatRiskScore(reason.currentScore),
          },
        }
      );
  }
};

/**
 * Joins the changed-signal labels into a subject for the staleness header
 * (e.g. "Entity risk", "Entity risk and Anomalies").
 */
export const joinSignalLabels = (labels: string[]): string => {
  if (labels.length <= 1) {
    return labels[0] ?? '';
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

export const EntityHighlightsResult: React.FC<EntityHighlightsResultProps> = ({
  assistantResult,
  showAnonymizedValues,
  generatedAt,
  generatedBy,
  authorProfileUid,
  stalenessReasons,
  onRefresh,
  canRegenerate = true,
  isRefreshing = false,
}) => {
  const anonymizedResult = useAnonymizedResponse(assistantResult, showAnonymizedValues);
  const textToCopy = useMemo(() => formatTextToCopy(anonymizedResult), [anonymizedResult]);

  const { data: userProfiles } = useBulkGetUserProfiles({
    uids: new Set(authorProfileUid ? [authorProfileUid] : []),
  });
  const authorProfile = userProfiles?.[0];
  const authorDisplayName = authorProfile?.user
    ? getUserDisplayName(authorProfile.user)
    : generatedBy;

  if (!anonymizedResult) {
    return null;
  }

  const formattedGeneratedAt = generatedAt
    ? moment(generatedAt).format('MMM DD, YYYY [at] HH:mm')
    : null;

  const isStale = Boolean(stalenessReasons && stalenessReasons.length > 0);
  const isSingleReason = stalenessReasons?.length === 1;
  // Header subject is derived from whichever signals changed, so new registry signals
  // (anomalies, rules, …) surface here automatically once given a translated label.
  const changedSignalLabels = stalenessReasons
    ? getChangedStalenessSignals(stalenessReasons).map(stalenessSignalLabel)
    : [];
  const stalenessMessages = stalenessReasons?.map(stalenessReasonMessage) ?? [];

  return (
    <EuiPanel hasBorder={true} css={{ position: 'relative' }}>
      {isRefreshing && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          data-test-subj="entity-highlights-refresh-progress"
        />
      )}
      {isStale && stalenessReasons && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            data-test-subj="entity-highlights-staleness-callout"
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.highlights.stalenessTitle"
                defaultMessage="{signals} {signalCount, plural, one {has} other {have}} changed since this summary was generated"
                values={{
                  signals: joinSignalLabels(changedSignalLabels),
                  signalCount: changedSignalLabels.length,
                }}
              />
            }
          >
            {/* Single reason reads as plain prose; only fall back to a list for multiple reasons. */}
            <EuiText size="s">
              {isSingleReason ? (
                <p>{stalenessMessages[0]}</p>
              ) : (
                <ul>
                  {stalenessMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}
            </EuiText>
            <EuiSpacer size="s" />
            {canRegenerate && (
              <EuiButton
                color="warning"
                iconType="refresh"
                onClick={onRefresh}
                data-test-subj="entity-highlights-staleness-regenerate"
              >
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.highlights.stalenessRegenerate"
                  defaultMessage="Regenerate summary"
                />
              </EuiButton>
            )}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Stale content is dimmed so the user immediately senses something is off */}
      <div style={{ opacity: isStale ? 0.45 : 1 }}>
        {anonymizedResult.highlights.length > 0 ? (
          anonymizedResult.highlights.map((highlight, index) => (
            <React.Fragment key={index}>
              <EuiText size="xs" color="default">
                <strong>{highlight.title}</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiMarkdownFormat textSize="xs" color="default">
                {highlight.text}
              </EuiMarkdownFormat>
              {index < anonymizedResult.highlights.length - 1 && <EuiSpacer size="m" />}
            </React.Fragment>
          ))
        ) : (
          <EuiText size="xs" color="subdued" textAlign="center">
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.highlights.emptyState"
              defaultMessage="There's not enough data to create an AI summary."
            />
          </EuiText>
        )}
        {anonymizedResult.recommended_actions &&
          anonymizedResult.recommended_actions.length > 0 && (
            <>
              <EuiHorizontalRule margin="m" />
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="documentation" size="m" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h4>
                      <FormattedMessage
                        id="xpack.securitySolution.flyout.entityDetails.highlights.recommendedActions"
                        defaultMessage="Recommended actions"
                      />
                    </h4>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiMarkdownFormat textSize="xs" color="default">
                {anonymizedResult.recommended_actions.map((action) => `- ${action}`).join('\n')}
              </EuiMarkdownFormat>
            </>
          )}
      </div>

      <>
        <EuiSpacer size="xs" />
        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            {generatedAt && anonymizedResult.highlights.length > 0 && (
              <EuiText size="xs" color="subdued">
                {authorDisplayName ? (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.highlights.generatedByUserTimestamp"
                    defaultMessage="Generated by {username} on {timestamp}"
                    values={{
                      username: <strong>{authorDisplayName}</strong>,
                      timestamp: formattedGeneratedAt,
                    }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.highlights.generatedTimestamp"
                    defaultMessage="Generated by AI on {timestamp}"
                    values={{
                      timestamp: formattedGeneratedAt,
                    }}
                  />
                )}
              </EuiText>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {canRegenerate && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.securitySolution.flyout.entityDetails.highlights.refreshAriaLabel',
                      { defaultMessage: 'Regenerate summary' }
                    )}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      iconType="refresh"
                      aria-label={i18n.translate(
                        'xpack.securitySolution.flyout.entityDetails.highlights.refreshAriaLabel',
                        { defaultMessage: 'Regenerate summary' }
                      )}
                      onClick={onRefresh}
                      size="xs"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              {textToCopy && (
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={textToCopy}>
                    {(copy) => (
                      <EuiToolTip
                        content={i18n.translate(
                          'xpack.securitySolution.flyout.entityDetails.highlights.copyAriaLabel',
                          { defaultMessage: 'Copy summary' }
                        )}
                        disableScreenReaderOutput
                      >
                        <EuiButtonIcon
                          iconType="copy"
                          aria-label={i18n.translate(
                            'xpack.securitySolution.flyout.entityDetails.highlights.copyAriaLabel',
                            { defaultMessage: 'Copy summary' }
                          )}
                          onClick={copy}
                          size="xs"
                        />
                      </EuiToolTip>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </EuiPanel>
  );
};

const useAnonymizedResponse = (
  assistantResult: {
    response: EntityHighlightsResponse | null;
    replacements: Replacements;
  } | null,
  showAnonymizedValues: boolean
): EntityHighlightsResponse | null => {
  return useMemo(() => {
    if (!assistantResult?.response) return null;
    const response = assistantResult.response;

    if (!showAnonymizedValues) {
      return {
        highlights: response.highlights.map((highlight) => ({
          title: highlight.title,
          text: replaceAnonymizedValuesWithOriginalValues({
            messageContent: highlight.text,
            replacements: assistantResult.replacements,
          }),
        })),
        recommended_actions: response.recommended_actions
          ? response.recommended_actions.map((action) =>
              replaceAnonymizedValuesWithOriginalValues({
                messageContent: action,
                replacements: assistantResult.replacements,
              })
            )
          : null,
      };
    }

    return response;
  }, [assistantResult, showAnonymizedValues]);
};

const formatTextToCopy = (response: EntityHighlightsResponse | null): string => {
  if (!response) return '';
  return response.highlights
    .map((highlight) => `- ${highlight.title}\n${highlight.text}\n`)
    .join('\n')
    .concat(
      response.recommended_actions
        ? `\nRecommended actions:\n${response.recommended_actions
            .map((action) => `- ${action} \n`)
            .join('\n')}`
        : ''
    );
};
