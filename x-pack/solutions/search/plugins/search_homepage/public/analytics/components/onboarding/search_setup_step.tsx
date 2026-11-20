/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';
import type { AnalyticsEventSource, AnalyticsLinks } from '../../types';
import { formatCompactNumber } from '../shared/event_source_utils';

interface SearchSetupStepProps {
  stepId: 'search' | 'build';
  /** The search source the step works with; undefined when the cluster names none. */
  source: AnalyticsEventSource | undefined;
  links: Pick<
    AnalyticsLinks,
    | 'canOpenAgentChat'
    | 'canOpenIndices'
    | 'askAgent'
    | 'openSearchRequest'
    | 'openConnectionDetails'
    | 'openIndexDetails'
  >;
}

/** Message sent to the agent when the user asks it to help build on one of their search sources. */
export const getBuildSearchAgentPrompt = (source: AnalyticsEventSource | undefined): string =>
  `Help me build a search experience on ${
    source === undefined
      ? 'my data'
      : `the ${source.name} ${source.kind === 'dataStream' ? 'data stream' : 'index'}`
  }. Look at its mappings and a few documents, recommend how to query it (full-text, semantic or hybrid search), then write and run an example search.`;

const SourceLine = ({ source }: { source: AnalyticsEventSource }): React.JSX.Element => (
  <>
    <EuiText size="s" color="subdued" data-test-subj="analyticsOnboardingSearchSource">
      <p>
        {source.documentsCount === null
          ? i18n.translate('xpack.searchHomepage.analytics.onboarding.search.source', {
              defaultMessage: 'Your data: {sourceName}',
              values: { sourceName: source.name },
            })
          : i18n.translate('xpack.searchHomepage.analytics.onboarding.search.sourceWithCount', {
              defaultMessage:
                'Your data: {sourceName} · {count, plural, one {# document} other {{formattedCount} documents}}',
              values: {
                sourceName: source.name,
                count: source.documentsCount,
                formattedCount: formatCompactNumber(source.documentsCount),
              },
            })}
      </p>
    </EuiText>
    <EuiSpacer size="m" />
  </>
);

const SearchStep = ({ source, links }: Omit<SearchSetupStepProps, 'stepId'>): React.JSX.Element => (
  <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
    <EuiFlexItem grow={false}>
      <EuiButton
        fill
        iconType="commandLine"
        onClick={() => links.openSearchRequest(source)}
        data-test-subj="analyticsOnboardingRunSearch"
        data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-onboarding-runSearch`}
      >
        {i18n.translate('xpack.searchHomepage.analytics.onboarding.search.runButton', {
          defaultMessage: 'Run a search in Console',
        })}
      </EuiButton>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        iconType="plugs"
        onClick={links.openConnectionDetails}
        data-test-subj="analyticsOnboardingConnectionDetails"
        data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-onboarding-connectionDetails`}
      >
        {i18n.translate('xpack.searchHomepage.analytics.onboarding.search.connectionButton', {
          defaultMessage: 'Connect your application',
        })}
      </EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const BuildStep = ({ source, links }: Omit<SearchSetupStepProps, 'stepId'>): React.JSX.Element => {
  const openIndexLabel =
    source?.kind === 'index'
      ? i18n.translate('xpack.searchHomepage.analytics.onboarding.build.openIndexButton', {
          defaultMessage: 'Open {sourceName} in Index Management',
          values: { sourceName: source.name },
        })
      : i18n.translate('xpack.searchHomepage.analytics.onboarding.build.openIndicesButton', {
          defaultMessage: 'Open Index Management',
        });
  const openIndexProps = {
    onClick: () => links.openIndexDetails(source),
    'data-test-subj': 'analyticsOnboardingOpenIndex',
    'data-telemetry-id': `${ANALYTICS_TELEMETRY_PREFIX}-onboarding-openIndex`,
  };

  if (!links.canOpenAgentChat && !links.canOpenIndices) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="analyticsOnboardingBuildUnavailable">
        <p>
          {i18n.translate('xpack.searchHomepage.analytics.onboarding.build.unavailable', {
            defaultMessage: 'The AI agent and Index Management are not available to you.',
          })}
        </p>
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
      {links.canOpenAgentChat && (
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="productAgent"
            onClick={() => links.askAgent(getBuildSearchAgentPrompt(source))}
            data-test-subj="analyticsOnboardingChatWithData"
            data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-onboarding-chatWithData`}
          >
            {i18n.translate('xpack.searchHomepage.analytics.onboarding.build.chatButton', {
              defaultMessage: 'Chat with your data',
            })}
          </EuiButton>
        </EuiFlexItem>
      )}
      {links.canOpenIndices && (
        <EuiFlexItem grow={false}>
          {links.canOpenAgentChat ? (
            <EuiButtonEmpty {...openIndexProps}>{openIndexLabel}</EuiButtonEmpty>
          ) : (
            <EuiButton fill {...openIndexProps}>
              {openIndexLabel}
            </EuiButton>
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/** The steps that follow ingest for search data: run a first search, then build on it. */
export const SearchSetupStep = ({
  stepId,
  source,
  links,
}: SearchSetupStepProps): React.JSX.Element => (
  <EuiPanel hasBorder paddingSize="l" data-test-subj={`analyticsOnboardingSearchPanel-${stepId}`}>
    {source !== undefined && <SourceLine source={source} />}
    {stepId === 'search' ? (
      <SearchStep source={source} links={links} />
    ) : (
      <BuildStep source={source} links={links} />
    )}
  </EuiPanel>
);
