/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import {
  replaceAnonymizedValuesWithOriginalValues,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import type { EntityHighlightsResponse } from '../types';

export type StalenessDisplayMode = 'banner' | 'inline';

interface EntityHighlightsResultProps {
  assistantResult: {
    response: EntityHighlightsResponse | null;
    replacements: Replacements;
  } | null;
  showAnonymizedValues: boolean;
  generatedAt: number | null;
  generatedBy?: string;
  stalenessReasons?: string[];
  stalenessDisplayMode?: StalenessDisplayMode;
  onRefresh: () => void;
}

export const EntityHighlightsResult: React.FC<EntityHighlightsResultProps> = ({
  assistantResult,
  showAnonymizedValues,
  generatedAt,
  generatedBy,
  stalenessReasons,
  stalenessDisplayMode = 'banner',
  onRefresh,
}) => {
  const { euiTheme } = useEuiTheme();
  const anonymizedResult = useAnonymizedResponse(assistantResult, showAnonymizedValues);
  const textToCopy = useMemo(() => formatTextToCopy(anonymizedResult), [anonymizedResult]);

  if (!anonymizedResult) {
    return null;
  }

  const isStale = stalenessReasons && stalenessReasons.length > 0;

  const showInlineStaleness = isStale && stalenessDisplayMode === 'inline';

  return (
    <EuiPanel hasBorder={true}>
      {isStale && stalenessDisplayMode === 'banner' && (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            data-test-subj="entity-highlights-staleness-callout"
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.highlights.stalenessTitle"
                defaultMessage="Entity data has changed since this summary was generated"
              />
            }
          >
            <EuiText size="xs">
              <ul style={{ margin: 0, paddingLeft: '1em' }}>
                {stalenessReasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiButtonEmpty
              size="s"
              iconType="refresh"
              onClick={onRefresh}
              data-test-subj="entity-highlights-staleness-regenerate"
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.highlights.stalenessRegenerate"
                defaultMessage="Regenerate summary"
              />
            </EuiButtonEmpty>
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
        {anonymizedResult.recommendedActions && anonymizedResult.recommendedActions.length > 0 && (
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
              {anonymizedResult.recommendedActions.map((action) => `- ${action}`).join('\n')}
            </EuiMarkdownFormat>
          </>
        )}
      </div>

      {/* Inline staleness: prominent full-width CTA after the dimmed content */}
      {showInlineStaleness && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            data-test-subj="entity-highlights-staleness-inline"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="warning" color="warning" size="s" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText size="xs" color="warning">
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.highlights.stalenessInlineLabel"
                  defaultMessage="Summary may be outdated — {reasons}"
                  values={{ reasons: stalenessReasons.join(', ') }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiButton
            fullWidth
            fill
            color="warning"
            iconType="refresh"
            size="s"
            onClick={onRefresh}
            data-test-subj="entity-highlights-staleness-inline-regenerate"
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.highlights.stalenessInlineRegenerate"
              defaultMessage="Regenerate summary"
            />
          </EuiButton>
        </>
      )}
      <>
        <EuiSpacer size="xs" />
        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            {generatedAt && anonymizedResult.highlights.length > 0 && (
              <EuiText size="xs" color="subdued">
                {generatedBy ? (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.highlights.generatedByUserTimestamp"
                    defaultMessage="Generated by {username} on {timestamp}"
                    values={{
                      username: <strong>{generatedBy}</strong>,
                      timestamp: moment(generatedAt).format('MMM DD, YYYY [at] HH:mm'),
                    }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.highlights.generatedTimestamp"
                    defaultMessage="Generated by AI on {timestamp}"
                    values={{
                      timestamp: moment(generatedAt).format('MMM DD, YYYY [at] HH:mm'),
                    }}
                  />
                )}
              </EuiText>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
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
        recommendedActions: response.recommendedActions
          ? response.recommendedActions.map((action) =>
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
      response.recommendedActions
        ? `\nRecommended actions:\n${response.recommendedActions
            .map((action) => `- ${action} \n`)
            .join('\n')}`
        : ''
    );
};
