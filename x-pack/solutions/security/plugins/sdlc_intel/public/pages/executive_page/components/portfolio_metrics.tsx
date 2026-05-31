/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcPortfolioSummary } from '../../../../common/api/types';
import type { ExecutiveDerivedMetrics } from '../lib/executive_filters';

export const PortfolioMetrics = ({
  summary,
  derived,
}: {
  summary: SdlcPortfolioSummary;
  derived: ExecutiveDerivedMetrics;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      <EuiFlexItem grow>
        <EuiPanel hasBorder paddingSize="m">
          <EuiStat
            title={`${summary.portfolioCoveragePct}%`}
            description={
              <FormattedMessage
                id="xpack.sdlcIntel.executive.metrics.portfolioCoverage"
                defaultMessage="Portfolio coverage"
              />
            }
            titleColor={euiTheme.colors.primary}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiPanel hasBorder paddingSize="m">
          <EuiStat
            title={
              <span>
                <span style={{ color: euiTheme.colors.success }}>
                  {summary.epicStatusCounts.closed}
                </span>
                {' / '}
                <span style={{ color: euiTheme.colors.warning }}>
                  {summary.epicStatusCounts.inProgress}
                </span>
                {' / '}
                <span style={{ color: euiTheme.colors.textSubdued }}>
                  {summary.epicStatusCounts.open}
                </span>
              </span>
            }
            description={
              <FormattedMessage
                id="xpack.sdlcIntel.executive.metrics.epicsByStatus"
                defaultMessage="Epics by status"
              />
            }
          />
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">
                <FormattedMessage
                  id="xpack.sdlcIntel.executive.metrics.done"
                  defaultMessage="{count} done"
                  values={{ count: summary.epicStatusCounts.closed }}
                />
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                <FormattedMessage
                  id="xpack.sdlcIntel.executive.metrics.active"
                  defaultMessage="{count} active"
                  values={{ count: summary.epicStatusCounts.inProgress }}
                />
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge>
                <FormattedMessage
                  id="xpack.sdlcIntel.executive.metrics.planned"
                  defaultMessage="{count} planned"
                  values={{ count: summary.epicStatusCounts.open }}
                />
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiPanel hasBorder paddingSize="m">
          <EuiStat
            title={`${derived.prdLinkagePct}%`}
            description={
              <FormattedMessage
                id="xpack.sdlcIntel.executive.metrics.prdLinkage"
                defaultMessage="PRD linkage"
              />
            }
          />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.sdlcIntel.executive.metrics.prdLinkageSub"
              defaultMessage="{linked} / {total} epics linked"
              values={{
                linked: derived.prdLinkedCount,
                total: summary.epicCount,
              }}
            />
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiPanel hasBorder paddingSize="m">
          <EuiStat
            title={derived.activeTicketCount}
            description={
              <FormattedMessage
                id="xpack.sdlcIntel.executive.metrics.activeTickets"
                defaultMessage="Active tickets"
              />
            }
          />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.sdlcIntel.executive.metrics.activeTicketsSub"
              defaultMessage="of {openCount} open"
              values={{ openCount: derived.openTicketCount }}
            />
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
