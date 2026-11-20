/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { BasicPrettyPrinter, Parser } from '@elastic/esql';
import { EuiBadge, EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SignalEntry, SignificantEvent } from '@kbn/significant-events-schema';
import { buildDiscoverParams } from '../../common/discover_helpers';
import { FlyoutSectionTitle } from '../../components/ui/flyout_section_title';
import { formatTimelineTime } from '../../common/format_timestamp';
import { TruncatableSummary } from '../../components/ui/truncatable_summary';
import { SeverityBadge } from '../../components/ui/severity_badge';

const DESCRIPTION_TITLE = i18n.translate(
  'xpack.nightshift.significantEventCanvas.descriptionTitle',
  { defaultMessage: 'Description' }
);

const CAUSAL_FEATURES_TITLE = i18n.translate(
  'xpack.nightshift.significantEventCanvas.causalFeaturesTitle',
  { defaultMessage: 'Causal features' }
);

const SIGNALS_TITLE = i18n.translate('xpack.nightshift.significantEventCanvas.signalsTitle', {
  defaultMessage: 'Signals',
});

const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.nightshift.significantEventCanvas.openInDiscoverLabel',
  { defaultMessage: 'Open in Discover' }
);

interface DetectionSignalRowProps {
  signal: Extract<SignalEntry, { type: 'detection' }>;
  share: SharePluginStart;
}

const replaceESQLLimit = (query: string): string => {
  const { root } = Parser.parse(query);
  return BasicPrettyPrinter.print({
    ...root,
    commands: root.commands.filter(
      (command) => command.name !== 'limit' && command.name !== 'keep'
    ),
  });
};

const DetectionSignalRow = ({ signal, share }: DetectionSignalRowProps) => {
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
    if (!normalizedQuery) {
      return undefined;
    }

    return share.url.locators
      .get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR)
      ?.getRedirectUrl(buildDiscoverParams(normalizedQuery, timeRange));
  }, [normalizedQuery, share, timeRange]);

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        {(signal.metadata?.rule_name || signal.collected_at) && (
          <EuiFlexItem grow={false}>
            {signal.metadata?.rule_name && (
              <EuiText size="s">
                <strong>{signal.metadata.rule_name}</strong>
              </EuiText>
            )}
            {signal.collected_at && (
              <EuiText size="xs" color="subdued">
                {formatTimelineTime(signal.collected_at)}
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
              data-test-subj="nightshiftSignificantEventCanvasOpenInDiscoverLink"
            >
              {OPEN_IN_DISCOVER_LABEL}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const SignificantEventCanvas = ({
  event,
  share,
}: {
  event: SignificantEvent;
  share: SharePluginStart;
}): React.ReactElement => {
  const detectionSignals = useMemo(
    () =>
      (event.signals ?? []).filter(
        (signal): signal is Extract<SignalEntry, { type: 'detection' }> =>
          signal.type === 'detection'
      ),
    [event.signals]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <SeverityBadge severity={event.severity} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <FlyoutSectionTitle>{DESCRIPTION_TITLE}</FlyoutSectionTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TruncatableSummary summary={event.summary} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {event.causal_features && event.causal_features.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <FlyoutSectionTitle>{CAUSAL_FEATURES_TITLE}</FlyoutSectionTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {event.causal_features.map((feature) => (
                  <EuiFlexItem grow={false} key={feature.feature_id}>
                    <EuiBadge>{feature.name}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      {detectionSignals.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <FlyoutSectionTitle>{SIGNALS_TITLE}</FlyoutSectionTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{detectionSignals.length}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {detectionSignals.map((signal, index) => (
              <EuiFlexItem
                grow={false}
                key={signal.metadata?.detection_id ?? `${signal.source_id}-${index}`}
              >
                <DetectionSignalRow signal={signal} share={share} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
