/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE, querySchema } from '@kbn/slo-schema';
import React, { useMemo } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { toIndicatorTypeLabel } from '../../../../utils/slo/labels';
import { createDiscoverLocator } from '../../utils/discover_links/get_discover_link';
import { ApmIndicatorOverview } from '../overview/apm_indicator_overview';
import { DisplayQuery } from '../overview/display_query';
import { SyntheticsIndicatorOverview } from '../overview/synthetics_indicator_overview';
import { DefinitionItem } from './definition_item';
import { getTimeRange } from './time_range_helper';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function IndicatorPanel({ slo }: Props) {
  const { discover, uiSettings } = useKibana().services;
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
  );
}
