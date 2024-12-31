/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiPanel, EuiText, useIsWithinBreakpoints } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import {
  SLOWithSummaryResponse,
  occurrencesBudgetingMethodSchema,
  querySchema,
  rollingTimeWindowTypeSchema,
} from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  BUDGETING_METHOD_OCCURRENCES,
  BUDGETING_METHOD_TIMESLICES,
  toDurationAdverbLabel,
  toDurationLabel,
  toIndicatorTypeLabel,
} from '../../../../utils/slo/labels';
import { ApmIndicatorOverview } from './apm_indicator_overview';
import { DisplayQuery } from './display_query';
import { OverviewItem } from './overview_item';
import { SyntheticsIndicatorOverview } from './synthetics_indicator_overview';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function Overview({ slo }: Props) {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const hasNoData = slo.summary.status === 'NO_DATA';

  let IndicatorOverview = null;
  switch (slo.indicator.type) {
    case 'sli.apm.transactionDuration':
    case 'sli.apm.transactionErrorRate':
      IndicatorOverview = <ApmIndicatorOverview slo={slo} />;
      break;
    case 'sli.synthetics.availability':
      IndicatorOverview = <SyntheticsIndicatorOverview slo={slo} />;
  }

  return (
    <EuiPanel paddingSize="none" color="transparent" data-test-subj="overview">
      <EuiFlexGrid columns={isMobile ? 2 : 4} gutterSize="l" responsive={false}>
        <OverviewItem
          title={i18n.translate('xpack.slo.sloDetails.overview.observedValueTitle', {
            defaultMessage: 'Observed value',
          })}
          subtitle={
            <EuiText size="s">
              {i18n.translate('xpack.slo.sloDetails.overview.observedValueSubtitle', {
                defaultMessage: '{value} (objective is {objective})',
                values: {
                  value: hasNoData ? '-' : numeral(slo.summary.sliValue).format(percentFormat),
                  objective: numeral(slo.objective.target).format(percentFormat),
                },
              })}
            </EuiText>
          }
        />
        <OverviewItem
          title={i18n.translate('xpack.slo.sloDetails.overview.indicatorTypeTitle', {
            defaultMessage: 'Indicator type',
          })}
          subtitle={<EuiText size="s">{toIndicatorTypeLabel(slo.indicator.type)}</EuiText>}
        />
        <OverviewItem
          title={i18n.translate('xpack.slo.sloDetails.overview.timeWindowTitle', {
            defaultMessage: 'Time window',
          })}
          subtitle={toTimeWindowLabel(slo.timeWindow)}
        />
        <OverviewItem
          title={i18n.translate('xpack.slo.sloDetails.overview.budgetingMethodTitle', {
            defaultMessage: 'Budgeting method',
          })}
          subtitle={
            occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) ? (
              <EuiText size="s">{BUDGETING_METHOD_OCCURRENCES}</EuiText>
            ) : (
              <EuiText size="s">
                {BUDGETING_METHOD_TIMESLICES} (
                {slo.indicator.type === 'sli.metric.timeslice'
                  ? i18n.translate(
                      'xpack.slo.sloDetails.overview.timeslicesBudgetingMethodDetailsForTimesliceMetric',
                      {
                        defaultMessage: '{duration} slices',
                        values: {
                          duration: toDurationLabel(slo.objective.timesliceWindow!),
                        },
                      }
                    )
                  : i18n.translate(
                      'xpack.slo.sloDetails.overview.timeslicesBudgetingMethodDetails',
                      {
                        defaultMessage: '{duration} slices, {target} target',
                        values: {
                          duration: toDurationLabel(slo.objective.timesliceWindow!),
                          target: numeral(slo.objective.timesliceTarget!).format(percentFormat),
                        },
                      }
                    )}
                )
              </EuiText>
            )
          }
        />
        <OverviewItem
          title={i18n.translate('xpack.slo.sloDetails.overview.descriptionTitle', {
            defaultMessage: 'Description',
          })}
          subtitle={<EuiText size="s">{!!slo.description ? slo.description : '-'}</EuiText>}
        />
        <OverviewItem
          title={i18n.translate('xpack.slo.sloDetails.overview.tagsTitle', {
            defaultMessage: 'Tags',
          })}
          subtitle={<TagsList tags={slo.tags} />}
        />
        {IndicatorOverview}
        {'index' in slo.indicator.params && (
          <OverviewItem
            title={i18n.translate('xpack.slo.sloDetails.overview.indexTitle', {
              defaultMessage: 'Index pattern',
            })}
            subtitle={slo.indicator.params.index}
          />
        )}
        {'filter' in slo.indicator.params && (
          <OverviewItem
            title={i18n.translate('xpack.slo.sloDetails.overview.overallQueryTitle', {
              defaultMessage: 'Overall query',
            })}
            subtitle={
              <DisplayQuery
                query={slo.indicator.params.filter}
                index={slo.indicator.params.index}
              />
            }
          />
        )}
        {'good' in slo.indicator.params && querySchema.is(slo.indicator.params.good) && (
          <OverviewItem
            title={i18n.translate('xpack.slo.sloDetails.overview.goodQueryTitle', {
              defaultMessage: 'Good query',
            })}
            subtitle={
              <DisplayQuery query={slo.indicator.params.good} index={slo.indicator.params.index} />
            }
          />
        )}
        {'total' in slo.indicator.params && querySchema.is(slo.indicator.params.total) && (
          <OverviewItem
            title={i18n.translate('xpack.slo.sloDetails.overview.totalQueryTitle', {
              defaultMessage: 'Total query',
            })}
            subtitle={
              <DisplayQuery query={slo.indicator.params.total} index={slo.indicator.params.index} />
            }
          />
        )}

        <OverviewItem
          title={i18n.translate('xpack.slo.sloDetails.overview.settings.syncDelay', {
            defaultMessage: 'Sync delay',
          })}
          subtitle={slo.settings.syncDelay}
        />
        <OverviewItem
          title={i18n.translate('xpack.slo.sloDetails.overview.settings.frequency', {
            defaultMessage: 'Frequency',
          })}
          subtitle={slo.settings.frequency}
        />
      </EuiFlexGrid>
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
