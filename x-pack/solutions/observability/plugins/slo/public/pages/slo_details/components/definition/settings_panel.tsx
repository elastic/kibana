/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import {
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowTypeSchema,
  type SLOWithSummaryResponse,
} from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  BUDGETING_METHOD_OCCURRENCES,
  BUDGETING_METHOD_TIMESLICES,
  toDurationAdverbLabel,
  toDurationLabel,
} from '../../../../utils/slo/labels';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SettingsPanel({ slo }: Props) {
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const hasTags = slo.tags && slo.tags.length > 0;

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.slo.sloDetails.definition.timeBudgetingTitle', {
            defaultMessage: 'Settings',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescriptionList type="column" columnGutterSize="s" rowGutterSize="s" compressed={true}>
        <EuiDescriptionListTitle>
          {i18n.translate('xpack.slo.sloDetails.overview.timeWindowTitle', {
            defaultMessage: 'Time window',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiText size="s">{toTimeWindowLabel(slo.timeWindow)}</EuiText>
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>
          {i18n.translate('xpack.slo.sloDetails.definition.objectiveTargetTitle', {
            defaultMessage: 'Objective target',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiText size="s">{numeral(slo.objective.target).format(percentFormat)}</EuiText>
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>
          {i18n.translate('xpack.slo.sloDetails.overview.budgetingMethodTitle', {
            defaultMessage: 'Budgeting method',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) ? (
            <EuiText size="s">{BUDGETING_METHOD_OCCURRENCES}</EuiText>
          ) : (
            <EuiText size="s">
              {BUDGETING_METHOD_TIMESLICES}
              {slo.indicator.type === 'sli.metric.timeslice'
                ? ` (${i18n.translate(
                    'xpack.slo.sloDetails.overview.timeslicesBudgetingMethodDetailsForTimesliceMetric',
                    {
                      defaultMessage: '{duration} slices',
                      values: {
                        duration: toDurationLabel(slo.objective.timesliceWindow!),
                      },
                    }
                  )})`
                : ` (${i18n.translate(
                    'xpack.slo.sloDetails.overview.timeslicesBudgetingMethodDetails',
                    {
                      defaultMessage: '{duration} slices, {target} target',
                      values: {
                        duration: toDurationLabel(slo.objective.timesliceWindow!),
                        target: numeral(slo.objective.timesliceTarget!).format(percentFormat),
                      },
                    }
                  )})`}
            </EuiText>
          )}
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>
          {i18n.translate('xpack.slo.sloDetails.overview.settings.frequency', {
            defaultMessage: 'Frequency',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiText size="s">{toDurationLabel(slo.settings.frequency)}</EuiText>
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>
          {i18n.translate('xpack.slo.sloDetails.overview.settings.syncDelay', {
            defaultMessage: 'Sync delay',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiText size="s">{toDurationLabel(slo.settings.syncDelay)}</EuiText>
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>
          {i18n.translate('xpack.slo.sloDetails.definition.syncFieldTitle', {
            defaultMessage: 'Sync field',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiText size="s">
            {/* @ts-expect-error - timestampField is not available for apm indicators */}
            {slo.settings.syncField ?? slo.indicator.params.timestampField ?? '-'}
          </EuiText>
        </EuiDescriptionListDescription>

        <EuiDescriptionListTitle>
          {i18n.translate('xpack.slo.sloDetails.definition.preventInitialBackfillTitle', {
            defaultMessage: 'Prevent initial backfill',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiText size="s">
            {slo.settings.preventInitialBackfill
              ? i18n.translate('xpack.slo.sloDetails.definition.yes', {
                  defaultMessage: 'Yes',
                })
              : i18n.translate('xpack.slo.sloDetails.definition.no', {
                  defaultMessage: 'No',
                })}
          </EuiText>
        </EuiDescriptionListDescription>

        {hasTags && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.slo.sloDetails.definition.tagsTitle', {
                defaultMessage: 'Tags',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {slo.tags.map((tag) => (
                  <EuiFlexItem key={tag} grow={false}>
                    <EuiBadge color="hollow">{tag}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiDescriptionListDescription>
          </>
        )}
      </EuiDescriptionList>
    </EuiPanel>
  );
}

function toTimeWindowLabel(timeWindow: SLOWithSummaryResponse['timeWindow']): string {
  if (rollingTimeWindowTypeSchema.is(timeWindow.type)) {
    return i18n.translate('xpack.slo.sloDetails.overview.rollingTimeWindow', {
      defaultMessage: '{duration} rolling',
      values: {
        duration: toDurationLabel(timeWindow.duration),
      },
    });
  }

  return i18n.translate('xpack.slo.sloDetails.overview.calendarAlignedTimeWindow', {
    defaultMessage: '{duration} calendar aligned',
    values: {
      duration: toDurationAdverbLabel(timeWindow.duration),
    },
  });
}
