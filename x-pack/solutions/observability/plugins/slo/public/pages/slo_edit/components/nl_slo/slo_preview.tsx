/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { CreateSLOForm } from '../../types';

const INDICATOR_TYPE_LABELS: Record<string, string> = {
  'sli.kql.custom': 'Custom Query (KQL)',
  'sli.apm.transactionDuration': 'APM Latency',
  'sli.apm.transactionErrorRate': 'APM Availability',
  'sli.metric.custom': 'Custom Metric',
  'sli.metric.timeslice': 'Timeslice Metric',
  'sli.histogram.custom': 'Histogram Metric',
  'sli.synthetics.availability': 'Synthetics Availability',
};

interface SloPreviewProps {
  sloDefinition: CreateSLOForm;
  explanation: string;
}

export function SloPreview({ sloDefinition, explanation }: SloPreviewProps) {
  const { name, description, indicator, timeWindow, budgetingMethod, objective, tags, groupBy } =
    sloDefinition;

  const indicatorType = indicator?.type ?? 'unknown';
  const indicatorParams = (indicator as Record<string, unknown>)?.params as
    | Record<string, unknown>
    | undefined;

  const sliDetails = buildSliDetails(indicatorType, indicatorParams);
  const objectiveDetails = buildObjectiveDetails(objective, budgetingMethod, timeWindow);

  return (
    <EuiPanel paddingSize="l" hasBorder data-test-subj="sloAiPreview">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {name ||
                i18n.translate('xpack.slo.nlSlo.preview.untitled', {
                  defaultMessage: 'Untitled SLO',
                })}
            </h3>
          </EuiTitle>
          {description && (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p>{description}</p>
              </EuiText>
            </>
          )}
        </EuiFlexItem>

        {tags && tags.length > 0 && (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {tags.map((tag) => (
                <EuiFlexItem key={tag} grow={false}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        <EuiHorizontalRule margin="xs" />

        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.slo.nlSlo.preview.sliSection', {
                defaultMessage: 'Service Level Indicator',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            type="column"
            compressed
            listItems={[
              {
                title: i18n.translate('xpack.slo.nlSlo.preview.indicatorType', {
                  defaultMessage: 'Indicator type',
                }),
                description: INDICATOR_TYPE_LABELS[indicatorType] ?? indicatorType,
              },
              ...sliDetails,
            ]}
          />
        </EuiFlexItem>

        <EuiHorizontalRule margin="xs" />

        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.slo.nlSlo.preview.objectiveSection', {
                defaultMessage: 'Objective',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList type="column" compressed listItems={objectiveDetails} />
        </EuiFlexItem>

        {groupBy && groupBy !== '*' && (
          <>
            <EuiHorizontalRule margin="xs" />
            <EuiFlexItem>
              <EuiDescriptionList
                type="column"
                compressed
                listItems={[
                  {
                    title: i18n.translate('xpack.slo.nlSlo.preview.groupBy', {
                      defaultMessage: 'Group by',
                    }),
                    description: Array.isArray(groupBy) ? groupBy.join(', ') : String(groupBy),
                  },
                ]}
              />
            </EuiFlexItem>
          </>
        )}

        <EuiHorizontalRule margin="xs" />

        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('xpack.slo.nlSlo.preview.explanation', {
                defaultMessage: 'AI explanation',
              })}
            </strong>
            <p>{explanation}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function buildSliDetails(
  indicatorType: string,
  params: Record<string, unknown> | undefined
): Array<{ title: string; description: string }> {
  if (!params) return [];

  const details: Array<{ title: string; description: string }> = [];

  if (params.index) {
    details.push({
      title: i18n.translate('xpack.slo.nlSlo.preview.index', { defaultMessage: 'Index' }),
      description: String(params.index),
    });
  }

  if (params.service) {
    details.push({
      title: i18n.translate('xpack.slo.nlSlo.preview.service', { defaultMessage: 'Service' }),
      description: String(params.service),
    });
  }

  if (params.environment) {
    details.push({
      title: i18n.translate('xpack.slo.nlSlo.preview.environment', {
        defaultMessage: 'Environment',
      }),
      description: String(params.environment),
    });
  }

  if (params.threshold !== undefined) {
    details.push({
      title: i18n.translate('xpack.slo.nlSlo.preview.threshold', {
        defaultMessage: 'Threshold',
      }),
      description: `${params.threshold}ms`,
    });
  }

  if (params.good && typeof params.good === 'string') {
    details.push({
      title: i18n.translate('xpack.slo.nlSlo.preview.goodQuery', {
        defaultMessage: 'Good events',
      }),
      description: String(params.good),
    });
  }

  if (params.total && typeof params.total === 'string') {
    details.push({
      title: i18n.translate('xpack.slo.nlSlo.preview.totalQuery', {
        defaultMessage: 'Total events',
      }),
      description: String(params.total),
    });
  }

  if (params.filter && typeof params.filter === 'string') {
    details.push({
      title: i18n.translate('xpack.slo.nlSlo.preview.filter', { defaultMessage: 'Filter' }),
      description: String(params.filter),
    });
  }

  return details;
}

function buildObjectiveDetails(
  objective: CreateSLOForm['objective'],
  budgetingMethod: string,
  timeWindow: CreateSLOForm['timeWindow']
): Array<{ title: string; description: string }> {
  const details: Array<{ title: string; description: string }> = [];

  details.push({
    title: i18n.translate('xpack.slo.nlSlo.preview.target', { defaultMessage: 'Target' }),
    description: `${objective?.target ?? 99}%`,
  });

  details.push({
    title: i18n.translate('xpack.slo.nlSlo.preview.budgetingMethod', {
      defaultMessage: 'Budgeting method',
    }),
    description: budgetingMethod === 'timeslices' ? 'Timeslices' : 'Occurrences',
  });

  if (budgetingMethod === 'timeslices' && objective?.timesliceTarget !== undefined) {
    details.push({
      title: i18n.translate('xpack.slo.nlSlo.preview.timesliceTarget', {
        defaultMessage: 'Timeslice target',
      }),
      description: `${(objective.timesliceTarget * 100).toFixed(1)}%`,
    });
  }

  if (budgetingMethod === 'timeslices' && objective?.timesliceWindow) {
    details.push({
      title: i18n.translate('xpack.slo.nlSlo.preview.timesliceWindow', {
        defaultMessage: 'Timeslice window',
      }),
      description: objective.timesliceWindow,
    });
  }

  details.push({
    title: i18n.translate('xpack.slo.nlSlo.preview.timeWindow', {
      defaultMessage: 'Time window',
    }),
    description: `${timeWindow?.duration ?? '30d'} (${
      timeWindow?.type === 'calendarAligned' ? 'Calendar' : 'Rolling'
    })`,
  });

  return details;
}
