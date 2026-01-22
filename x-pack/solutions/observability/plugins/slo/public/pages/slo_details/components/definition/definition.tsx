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
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import {
  ALL_VALUE,
  occurrencesBudgetingMethodSchema,
  querySchema,
  rollingTimeWindowTypeSchema,
} from '@kbn/slo-schema';
import React, { useMemo } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  BUDGETING_METHOD_OCCURRENCES,
  BUDGETING_METHOD_TIMESLICES,
  toDurationAdverbLabel,
  toDurationLabel,
  toIndicatorTypeLabel,
} from '../../../../utils/slo/labels';
import { createDiscoverLocator } from '../../utils/discover_links/get_discover_link';
import { ApmIndicatorOverview } from '../overview/apm_indicator_overview';
import { DisplayQuery } from '../overview/display_query';
import { SyntheticsIndicatorOverview } from '../overview/synthetics_indicator_overview';
import { DefinitionItem } from './definition_item';
import { LinkedDashboards } from './linked_dashboards';
import { getTimeRange } from './time_range_helper';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function Definition({ slo }: Props) {
  const { discover, uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const timeRange = getTimeRange(slo);

  let IndicatorOverview = null;
  switch (slo.indicator.type) {
    case 'sli.apm.transactionDuration':
    case 'sli.apm.transactionErrorRate':
      IndicatorOverview = <ApmIndicatorOverview slo={slo} />;
      break;
    case 'sli.synthetics.availability':
      IndicatorOverview = <SyntheticsIndicatorOverview slo={slo} />;
      break;
  }

  const groupBy = [slo.groupBy].flat();
  const hasGroupBy = !groupBy.includes(ALL_VALUE) && groupBy.length > 0;
  const hasTags = slo.tags && slo.tags.length > 0;

  const goodQueryDiscoverLink = useMemo(() => {
    const locatorConfig = createDiscoverLocator({
      slo,
      showGood: true,
      showBad: false,
      timeRange,
      uiSettings,
    });
    return discover?.locator?.getRedirectUrl(locatorConfig);
  }, [discover, slo, timeRange, uiSettings]);

  const totalQueryDiscoverLink = useMemo(() => {
    const locatorConfig = createDiscoverLocator({
      slo,
      showGood: false,
      showBad: false,
      timeRange,
      uiSettings,
    });
    return discover?.locator?.getRedirectUrl(locatorConfig);
  }, [discover, slo, timeRange, uiSettings]);

  return (
    <EuiFlexGroup
      direction={'row'}
      gutterSize="l"
      alignItems="flexStart"
      data-test-subj="definition"
    >
      <EuiFlexItem grow={1}>
        <EuiPanel hasShadow={false} hasBorder paddingSize="l">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.slo.sloDetails.definition.indicatorConfigurationTitle', {
                defaultMessage: 'Indicator configuration',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiDescriptionList
                type="column"
                columnGutterSize="s"
                rowGutterSize="s"
                compressed={true}
              >
                <EuiDescriptionListTitle>
                  {i18n.translate('xpack.slo.sloDetails.overview.indicatorTypeTitle', {
                    defaultMessage: 'Indicator type',
                  })}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <EuiText size="s">{toIndicatorTypeLabel(slo.indicator.type)}</EuiText>
                </EuiDescriptionListDescription>

                {'index' in slo.indicator.params && slo.indicator.params.index && (
                  <>
                    <EuiDescriptionListTitle>
                      {i18n.translate('xpack.slo.sloDetails.overview.indexTitle', {
                        defaultMessage: 'Index pattern',
                      })}
                    </EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <EuiText size="s">{slo.indicator.params.index}</EuiText>
                    </EuiDescriptionListDescription>
                  </>
                )}
                {hasGroupBy && (
                  <>
                    <EuiDescriptionListTitle>
                      {i18n.translate('xpack.slo.sloDetails.definition.groupByTitle', {
                        defaultMessage: 'Group by',
                      })}
                    </EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <EuiText size="s">{[slo.groupBy].flat().join(', ')}</EuiText>
                    </EuiDescriptionListDescription>
                  </>
                )}
              </EuiDescriptionList>
            </EuiFlexItem>
            {IndicatorOverview && <EuiFlexItem grow={false}>{IndicatorOverview}</EuiFlexItem>}
            {'filter' in slo.indicator.params && slo.indicator.params.filter && (
              <EuiFlexItem grow={false}>
                <DefinitionItem
                  title={
                    <EuiText size="s">
                      <strong>
                        {i18n.translate('xpack.slo.sloDetails.overview.overallQueryTitle', {
                          defaultMessage: 'Filter query',
                        })}
                      </strong>
                    </EuiText>
                  }
                  subtitle={
                    <DisplayQuery
                      query={slo.indicator.params.filter}
                      index={'index' in slo.indicator.params ? slo.indicator.params.index : ''}
                    />
                  }
                />
              </EuiFlexItem>
            )}
            {'good' in slo.indicator.params && querySchema.is(slo.indicator.params.good) && (
              <EuiFlexItem grow={false}>
                <DefinitionItem
                  title={
                    goodQueryDiscoverLink ? (
                      <EuiLink
                        href={goodQueryDiscoverLink}
                        external
                        target="_blank"
                        data-test-subj="sloDefinitionGoodQueryDiscoverLink"
                      >
                        {i18n.translate('xpack.slo.sloDetails.overview.goodQueryTitle', {
                          defaultMessage: 'Good query',
                        })}
                      </EuiLink>
                    ) : (
                      i18n.translate('xpack.slo.sloDetails.overview.goodQueryTitle', {
                        defaultMessage: 'Good query',
                      })
                    )
                  }
                  subtitle={
                    <DisplayQuery
                      query={slo.indicator.params.good}
                      index={'index' in slo.indicator.params ? slo.indicator.params.index : ''}
                    />
                  }
                />
              </EuiFlexItem>
            )}
            {'total' in slo.indicator.params && querySchema.is(slo.indicator.params.total) && (
              <EuiFlexItem grow={false}>
                <DefinitionItem
                  title={
                    totalQueryDiscoverLink ? (
                      <EuiLink
                        href={totalQueryDiscoverLink}
                        external
                        target="_blank"
                        data-test-subj="sloDefinitionTotalQueryDiscoverLink"
                      >
                        {i18n.translate('xpack.slo.sloDetails.overview.totalQueryTitle', {
                          defaultMessage: 'Total query',
                        })}
                      </EuiLink>
                    ) : (
                      i18n.translate('xpack.slo.sloDetails.overview.totalQueryTitle', {
                        defaultMessage: 'Total query',
                      })
                    )
                  }
                  subtitle={
                    <DisplayQuery
                      query={slo.indicator.params.total}
                      index={'index' in slo.indicator.params ? slo.indicator.params.index : ''}
                    />
                  }
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiPanel hasShadow={false} hasBorder paddingSize="l">
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.slo.sloDetails.definition.timeBudgetingTitle', {
                    defaultMessage: 'Settings',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiDescriptionList
                type="column"
                columnGutterSize="s"
                rowGutterSize="s"
                compressed={true}
              >
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
                                target: numeral(slo.objective.timesliceTarget!).format(
                                  percentFormat
                                ),
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
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiPanel hasShadow={false} hasBorder paddingSize="l">
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.slo.sloDetails.definition.linkedDashboardsTitle', {
                    defaultMessage: 'Linked dashboards',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <LinkedDashboards dashboards={slo.artifacts?.dashboards ?? []} />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
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
