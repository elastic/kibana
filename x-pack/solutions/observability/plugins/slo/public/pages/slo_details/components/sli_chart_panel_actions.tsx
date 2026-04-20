/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useFetchApmIndex } from '../../../hooks/use_fetch_apm_indices';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { getResolvedApmParams } from '../../../utils/slo/get_apm_source_field_link';
import { getApmTracesDiscoverUrl } from '../utils/discover_links/get_discover_link';

const openLabel = i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.open', {
  defaultMessage: 'Open',
});

const inApmLabel = i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.inApm', {
  defaultMessage: 'In APM',
});

const tracesInDiscoverLabel = i18n.translate(
  'xpack.slo.sloDetails.sliHistoryChartPanel.tracesInDiscover',
  { defaultMessage: 'Traces in Discover' }
);

function splitCommaSeparatedIndexPatterns(pattern: string | undefined): string[] {
  return pattern ? pattern.split(',') : [];
}

interface SliChartPanelActionsProps {
  slo: SLOWithSummaryResponse;
  timeRange?: { from: string; to: string };
}

export function SliChartPanelActions({ slo, timeRange }: SliChartPanelActionsProps) {
  const {
    services: {
      share,
      http: { basePath },
      application: { capabilities },
    },
  } = useKibana();

  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const apmUrl = convertSliApmParamsToApmAppDeeplinkUrl(slo, timeRange);
  const apmLink = apmUrl ? basePath.prepend(apmUrl) : undefined;

  const {
    data: { transaction, span },
  } = useFetchApmIndex({ enabled: true });

  const tracesIndices = [
    ...new Set([
      ...splitCommaSeparatedIndexPatterns(transaction),
      ...splitCommaSeparatedIndexPatterns(span),
    ]),
  ].join(', ');

  const discoverLink = (() => {
    if (!tracesIndices) return undefined;

    const resolved = getResolvedApmParams(slo);

    return getApmTracesDiscoverUrl({
      params: {
        index: tracesIndices,
        serviceName: resolved.serviceName,
        environment: resolved.environment,
        transactionType: resolved.transactionType,
        transactionName: resolved.transactionName,
      },
      share,
      timeRange: timeRange ?? { from: `now-${slo.timeWindow.duration}`, to: 'now' },
    });
  })();

  const hasApmReadCapabilities = !!capabilities.apm?.show;
  const isRemote = !!slo.remote;
  const canNavigateToApm = hasApmReadCapabilities && !isRemote;

  const isApmLinkEnabled = canNavigateToApm && !!apmLink;
  const isDiscoverLinkEnabled = !!discoverLink;

  return (
    <EuiPopover
      aria-label={openLabel}
      button={
        <EuiButtonEmpty
          size="s"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsActionsOpen(!isActionsOpen)}
          data-test-subj="sliChartActionsButton"
        >
          {openLabel}
        </EuiButtonEmpty>
      }
      isOpen={isActionsOpen}
      closePopover={() => setIsActionsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel>
        <EuiContextMenuItem
          href={apmLink}
          disabled={!isApmLinkEnabled}
          data-test-subj="sliHistoryChartViewInApmLink"
          data-action="openInApm"
          data-source={slo.indicator.type}
        >
          {inApmLabel}
        </EuiContextMenuItem>
        <EuiContextMenuItem
          href={discoverLink}
          disabled={!isDiscoverLinkEnabled}
          data-test-subj="sliHistoryChartOpenInDiscoverLink"
          data-action="openTracesInDiscover"
          data-source={slo.indicator.type}
        >
          {tracesInDiscoverLabel}
        </EuiContextMenuItem>
      </EuiContextMenuPanel>
    </EuiPopover>
  );
}
