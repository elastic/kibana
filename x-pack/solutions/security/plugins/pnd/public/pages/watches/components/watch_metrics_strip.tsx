/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, useEuiTheme } from '@elastic/eui';
import type { Watch } from '@kbn/pnd-common';
import { RunSparkline } from './run_sparkline';
import * as i18n from '../settings_translations';

const EM_DASH = '—';

interface WatchMetricsStripProps {
  watch: Watch;
}

/**
 * Incidents, acceptance rate and time saved, spread across the full content width and divided by
 * vertical rules.
 *
 * Every stat is `reverse`, which in `EuiStat` puts the label under the figure.
 *
 * EUI has no divided flex group and no vertical counterpart to `EuiHorizontalRule`, so the dividers
 * are a single `border-inline-end` rule using the theme's own border token.
 *
 * `acceptedPct` and `timeSaved` are null by construction in the real projection, so the em dash is
 * the expected state outside mock data rather than an error.
 */
export const WatchMetricsStrip: React.FC<WatchMetricsStripProps> = ({ watch }) => {
  const { euiTheme } = useEuiTheme();
  const { runs7d, acceptedPct, timeSaved } = watch.metrics;

  const cells: Array<{ key: string; node: React.ReactNode }> = [
    {
      key: 'incidents',
      node: (
        <EuiStat
          reverse
          title={
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>{runs7d ?? EM_DASH}</EuiFlexItem>
              {runs7d != null ? (
                <EuiFlexItem grow={false}>
                  <RunSparkline seed={watch.id} color={watch.color} />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          }
          description={i18n.METRIC_INCIDENTS_7D}
          titleSize="s"
          textAlign="left"
          data-test-subj="pndWatchMetricIncidents"
        />
      ),
    },
    {
      key: 'accepted',
      node: (
        <EuiStat
          reverse
          title={acceptedPct != null ? `${acceptedPct}%` : EM_DASH}
          description={i18n.METRIC_ACCEPTED}
          titleSize="s"
          textAlign="left"
          data-test-subj="pndWatchMetricAccepted"
        />
      ),
    },
    {
      key: 'timeSaved',
      node: (
        <EuiStat
          reverse
          title={timeSaved ?? EM_DASH}
          description={i18n.METRIC_TIME_SAVED}
          titleSize="s"
          textAlign="left"
          data-test-subj="pndWatchMetricTimeSaved"
        />
      ),
    },
  ];

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      data-test-subj="pndWatchMetricsStrip"
      // Casing is presentational, so it is applied here rather than baked into the messages —
      // uppercase source strings read as shouting to translators and do not survive languages with
      // their own casing rules.
      css={css`
        .euiStat__description {
          padding-top: ${euiTheme.size.s};
          text-transform: uppercase;
          font-size: ${euiTheme.font.scale.s};
          color: ${euiTheme.colors.textSubdued};
        }
      `}
    >
      <EuiFlexGroup gutterSize="none" responsive={false}>
        {cells.map(({ key, node }, index) => (
          <EuiFlexItem
            key={key}
            css={css`
              padding-inline: ${index === 0 ? `0 ${euiTheme.size.l}` : euiTheme.size.l};
              ${index < cells.length - 1 ? `border-inline-end: ${euiTheme.border.thin};` : ''}
            `}
          >
            {node}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
