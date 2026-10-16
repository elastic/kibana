/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { BasicPrettyPrinter, Parser } from '@elastic/esql';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  SignalEntry,
  SignificantEvent,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { buildDiscoverParams } from '../../util/discover_helpers';
import { formatTimestamp } from '../../util/formatters';
import { InfoPanel } from '../info_panel';
import { useKibana } from '../../hooks/use_kibana';

const DESCRIPTION_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.descriptionTitle',
  { defaultMessage: 'Description' }
);

const CAUSAL_FEATURES_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.causalFeatures',
  { defaultMessage: 'Causal features' }
);

const SIGNALS_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.signalsTitle',
  {
    defaultMessage: 'Signals',
  }
);

const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventDetails.openInDiscoverLabel',
  {
    defaultMessage: 'Open in Discover',
  }
);

interface DetectionSignalRowProps {
  signal: Extract<SignalEntry, { type: 'detection' }>;
}

const replaceESQLLimit = (query: string) => {
  const { root } = Parser.parse(query);
  const queryWithoutLimit = BasicPrettyPrinter.print({
    ...root,
    commands: root.commands.filter(
      (command) => command.name !== 'limit' && command.name !== 'keep'
    ),
  });

  return queryWithoutLimit;
};

const DetectionSignalRow = ({ signal }: DetectionSignalRowProps) => {
  const { dependencies } = useKibana();
  const { share } = dependencies.start;
  const { euiTheme } = useEuiTheme();
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

  const esqlQuery = signal.evidence?.esql_query;
  const normalizedQuery = useMemo(
    () => (esqlQuery ? replaceESQLLimit(esqlQuery) : undefined),
    [esqlQuery]
  );
  const timeRange = useMemo(
    () => signal.evidence?.time_range ?? { from: 'now-1h', to: 'now' },
    [signal.evidence?.time_range]
  );
  const queryHref = useMemo(() => {
    if (!normalizedQuery || !discoverLocator) {
      return undefined;
    }

    return discoverLocator.getRedirectUrl(buildDiscoverParams(normalizedQuery, timeRange));
  }, [normalizedQuery, timeRange, discoverLocator]);

  return (
    <EuiFlexGroup
      gutterSize="xs"
      responsive={false}
      css={{ padding: `${euiTheme.size.m} ${euiTheme.size.m}` }}
      wrap
    >
      {signal.metadata?.rule_name && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" textAlign="left">
            <strong>{signal.metadata.rule_name}</strong>
          </EuiText>
          {signal.collected_at && (
            <EuiText size="xs" color="subdued">
              {formatTimestamp(signal.collected_at)}
            </EuiText>
          )}
        </EuiFlexItem>
      )}

      {signal.description && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {signal.description}
          </EuiText>
        </EuiFlexItem>
      )}

      {normalizedQuery && (
        <EuiFlexItem grow={false}>
          <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
            {normalizedQuery}
          </EuiCodeBlock>
        </EuiFlexItem>
      )}

      {queryHref && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            iconType="discoverApp"
            href={queryHref}
            target="_blank"
            data-test-subj="significantEventDetailsOpenInDiscoverLink"
          >
            {OPEN_IN_DISCOVER_LABEL}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const SignalListPanel = ({ children }: { children: React.ReactNode[] }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      {React.Children.map(children, (child, index) => (
        <div css={index < children.length - 1 ? { borderBottom: euiTheme.border.thin } : undefined}>
          {child}
        </div>
      ))}
    </EuiPanel>
  );
};

interface SignificantEventDetailsProps {
  event: SignificantEvent | SignificantEventResponse;
}

export const SignificantEventDetails = ({ event }: SignificantEventDetailsProps) => {
  const signals = useMemo(() => event.signals ?? [], [event.signals]);
  const detectionSignals = useMemo(() => signals.filter((s) => s.type === 'detection'), [signals]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {event.summary && (
        <InfoPanel title={DESCRIPTION_TITLE}>
          <EuiText size="s">
            <p>{event.summary}</p>
          </EuiText>
        </InfoPanel>
      )}

      {event.causal_features && event.causal_features.length > 0 && (
        <InfoPanel title={CAUSAL_FEATURES_TITLE}>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {event.causal_features.map((feature) => (
              <EuiFlexItem grow={false} key={feature.feature_id}>
                <EuiBadge>{feature.name}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </InfoPanel>
      )}

      {detectionSignals.length > 0 && (
        <InfoPanel
          title={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{SIGNALS_TITLE}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{detectionSignals.length}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <SignalListPanel>
            {detectionSignals.map((signal, idx) => {
              return <DetectionSignalRow key={idx} signal={signal} />;
            })}
          </SignalListPanel>
        </InfoPanel>
      )}
    </EuiFlexGroup>
  );
};
