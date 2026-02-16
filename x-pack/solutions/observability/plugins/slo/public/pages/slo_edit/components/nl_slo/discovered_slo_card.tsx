/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCheckbox,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { ProposedSlo } from '../../../../hooks/use_discover_slos';

const INDICATOR_TYPE_LABELS: Record<string, string> = {
  'sli.kql.custom': 'Custom Query (KQL)',
  'sli.apm.transactionDuration': 'APM Latency',
  'sli.apm.transactionErrorRate': 'APM Availability',
  'sli.metric.custom': 'Custom Metric',
  'sli.metric.timeslice': 'Timeslice Metric',
  'sli.histogram.custom': 'Histogram Metric',
  'sli.synthetics.availability': 'Synthetics Availability',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'default',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: i18n.translate('xpack.slo.discover.priority.critical', {
    defaultMessage: 'Critical',
  }),
  high: i18n.translate('xpack.slo.discover.priority.high', {
    defaultMessage: 'High',
  }),
  medium: i18n.translate('xpack.slo.discover.priority.medium', {
    defaultMessage: 'Medium',
  }),
  low: i18n.translate('xpack.slo.discover.priority.low', {
    defaultMessage: 'Low',
  }),
};

const CATEGORY_ICONS: Record<string, string> = {
  availability: 'checkInCircleFilled',
  latency: 'clock',
  correctness: 'check',
  uptime: 'online',
  throughput: 'sortUp',
};

const CATEGORY_LABELS: Record<string, string> = {
  availability: i18n.translate('xpack.slo.discover.category.availability', {
    defaultMessage: 'Availability',
  }),
  latency: i18n.translate('xpack.slo.discover.category.latency', {
    defaultMessage: 'Latency',
  }),
  correctness: i18n.translate('xpack.slo.discover.category.correctness', {
    defaultMessage: 'Correctness',
  }),
  uptime: i18n.translate('xpack.slo.discover.category.uptime', {
    defaultMessage: 'Uptime',
  }),
  throughput: i18n.translate('xpack.slo.discover.category.throughput', {
    defaultMessage: 'Throughput',
  }),
};

interface DiscoveredSloCardProps {
  proposal: ProposedSlo;
  index: number;
  isSelected: boolean;
  onToggle: (index: number) => void;
}

export function DiscoveredSloCard({
  proposal,
  index,
  isSelected,
  onToggle,
}: DiscoveredSloCardProps) {
  const { sloDefinition, rationale, category, priority } = proposal;
  const { name, description, indicator, timeWindow, budgetingMethod, objective, tags, groupBy } =
    sloDefinition as Record<string, unknown>;

  const indicatorObj = indicator as { type?: string; params?: Record<string, unknown> } | undefined;
  const indicatorType = indicatorObj?.type ?? 'unknown';
  const indicatorParams = indicatorObj?.params;

  const objectiveObj = objective as {
    target?: number;
    timesliceTarget?: number;
    timesliceWindow?: string;
  } | undefined;

  const timeWindowObj = timeWindow as { duration?: string; type?: string } | undefined;

  const handleToggle = useCallback(() => {
    onToggle(index);
  }, [index, onToggle]);

  const details: Array<{ title: string; description: string }> = [
    {
      title: i18n.translate('xpack.slo.discover.card.indicatorType', {
        defaultMessage: 'Indicator',
      }),
      description: INDICATOR_TYPE_LABELS[indicatorType] ?? indicatorType,
    },
    {
      title: i18n.translate('xpack.slo.discover.card.target', {
        defaultMessage: 'Target',
      }),
      description: `${objectiveObj?.target ?? 99}%`,
    },
    {
      title: i18n.translate('xpack.slo.discover.card.timeWindow', {
        defaultMessage: 'Window',
      }),
      description: `${timeWindowObj?.duration ?? '30d'} (${timeWindowObj?.type === 'calendarAligned' ? 'Calendar' : 'Rolling'})`,
    },
    {
      title: i18n.translate('xpack.slo.discover.card.budgeting', {
        defaultMessage: 'Budgeting',
      }),
      description: (budgetingMethod as string) === 'timeslices' ? 'Timeslices' : 'Occurrences',
    },
  ];

  if (indicatorParams?.service) {
    details.push({
      title: i18n.translate('xpack.slo.discover.card.service', { defaultMessage: 'Service' }),
      description: String(indicatorParams.service),
    });
  }

  if (indicatorParams?.environment) {
    details.push({
      title: i18n.translate('xpack.slo.discover.card.environment', {
        defaultMessage: 'Environment',
      }),
      description: String(indicatorParams.environment),
    });
  }

  if (indicatorParams?.index) {
    details.push({
      title: i18n.translate('xpack.slo.discover.card.index', { defaultMessage: 'Index' }),
      description: String(indicatorParams.index),
    });
  }

  if (groupBy && groupBy !== '*') {
    details.push({
      title: i18n.translate('xpack.slo.discover.card.groupBy', { defaultMessage: 'Group by' }),
      description: Array.isArray(groupBy) ? (groupBy as string[]).join(', ') : String(groupBy),
    });
  }

  return (
    <EuiPanel
      paddingSize="m"
      hasBorder
      hasShadow={false}
      color={isSelected ? 'primary' : 'plain'}
      data-test-subj={`discoveredSloCard-${index}`}
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={`discovered-slo-${index}`}
            checked={isSelected}
            onChange={handleToggle}
            data-test-subj={`discoveredSloCheckbox-${index}`}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h4>{(name as string) || 'Untitled SLO'}</h4>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={i18n.translate('xpack.slo.discover.card.priorityTooltip', {
                          defaultMessage: 'Priority: {priority}',
                          values: { priority: PRIORITY_LABELS[priority] ?? priority },
                        })}
                      >
                        <EuiBadge color={PRIORITY_COLORS[priority] ?? 'default'}>
                          {PRIORITY_LABELS[priority] ?? priority}
                        </EuiBadge>
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge
                        color="hollow"
                        iconType={CATEGORY_ICONS[category] ?? 'questionInCircle'}
                      >
                        {CATEGORY_LABELS[category] ?? category}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            {description && (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  <p>{description as string}</p>
                </EuiText>
              </EuiFlexItem>
            )}

            <EuiHorizontalRule margin="xs" />

            <EuiFlexItem>
              <EuiDescriptionList type="inline" compressed listItems={details} />
            </EuiFlexItem>

            {(tags as string[] | undefined)?.length ? (
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                  {(tags as string[]).map((tag) => (
                    <EuiFlexItem key={tag} grow={false}>
                      <EuiBadge color="hollow">{tag}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            ) : null}

            <EuiSpacer size="xs" />

            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <em>{rationale}</em>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
