/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useMemo } from 'react';
import { asCost } from '../../utils/formatters/as_cost';
import { asWeight } from '../../utils/formatters/as_weight';
import { calculateBaseComparisonDiff } from '../topn_functions/utils';
import { SummaryItem } from './summary_item';

interface FrameValue {
  totalCount: number;
  scaleFactor?: number;
  totalAnnualCO2Kgs: number;
  totalAnnualCostUSD: number;
}

interface Props {
  baseValue?: FrameValue;
  comparisonValue?: FrameValue;
  isLoading: boolean;
  hasBorder?: boolean;
  compressed?: boolean;
}

const ESTIMATED_VALUE_LABEL = i18n.translate('xpack.profiling.diffTopNFunctions.estimatedValue', {
  defaultMessage: 'Estimated value',
}) as string;

function getScaleFactor(scaleFactor: number = 1) {
  return scaleFactor;
}

export function FramesSummary({
  baseValue,
  comparisonValue,
  isLoading,
  hasBorder = false,
  compressed = false,
}: Props) {
  const baselineScaledTotalSamples = baseValue
    ? baseValue.totalCount * getScaleFactor(baseValue.scaleFactor)
    : 0;

  const comparisonScaledTotalSamples = comparisonValue
    ? comparisonValue.totalCount * getScaleFactor(comparisonValue.scaleFactor)
    : 0;

  const { co2EmissionDiff, costImpactDiff, totalSamplesDiff } = useMemo(() => {
    return {
      totalSamplesDiff: calculateBaseComparisonDiff({
        baselineValue: baselineScaledTotalSamples || 0,
        comparisonValue: comparisonScaledTotalSamples || 0,
      }),
      co2EmissionDiff: calculateBaseComparisonDiff({
        baselineValue: baseValue?.totalAnnualCO2Kgs || 0,
        comparisonValue: comparisonValue?.totalAnnualCO2Kgs || 0,
        formatValue: (value) => asWeight(value, 'kgs'),
      }),
      costImpactDiff: calculateBaseComparisonDiff({
        baselineValue: baseValue?.totalAnnualCostUSD || 0,
        comparisonValue: comparisonValue?.totalAnnualCostUSD || 0,
        formatValue: asCost,
      }),
    };
  }, [baseValue, baselineScaledTotalSamples, comparisonScaledTotalSamples, comparisonValue]);

  const data = [
    {
      id: 'overallPerformance',
      title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.performance', {
        defaultMessage: '{label} overall performance by',
        values: {
          label:
            isLoading ||
            totalSamplesDiff.percentDiffDelta === undefined ||
            totalSamplesDiff.label === undefined
              ? 'Gained/Lost'
              : totalSamplesDiff?.percentDiffDelta > 0
              ? 'Lost'
              : 'Gained',
        },
      }) as string,
      baseValue: totalSamplesDiff.label || '0%',
      baseColor: totalSamplesDiff.color,
      titleHint: ESTIMATED_VALUE_LABEL,
      hidden: isEmpty(comparisonValue),
    },
    {
      id: 'annualizedCo2',
      title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.co2', {
        defaultMessage: 'Annualized CO2 emission impact',
      }) as string,
      baseValue: co2EmissionDiff.baseValue,
      comparisonValue: co2EmissionDiff.comparisonValue,
      comparisonColor: co2EmissionDiff.color,
      comparisonPerc: co2EmissionDiff.label,
      titleHint: ESTIMATED_VALUE_LABEL,
    },
    {
      id: 'annualizedCost',
      title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.cost', {
        defaultMessage: 'Annualized cost impact',
      }) as string,
      baseValue: costImpactDiff.baseValue,
      comparisonValue: costImpactDiff.comparisonValue,
      comparisonColor: costImpactDiff.color,
      comparisonPerc: costImpactDiff.label,
      titleHint: ESTIMATED_VALUE_LABEL,
    },
    {
      id: 'totalNumberOfSamples',
      title: i18n.translate('xpack.profiling.diffTopNFunctions.summary.samples', {
        defaultMessage: 'Total number of samples',
      }) as string,
      baseValue: totalSamplesDiff.baseValue,
      comparisonValue: totalSamplesDiff.comparisonValue,
      comparisonColor: totalSamplesDiff.color,
      comparisonPerc: totalSamplesDiff.label,
      titleHint: ESTIMATED_VALUE_LABEL,
    },
  ];

  const Summary = (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row">
        {data
          .filter((item) => !item.hidden)
          .map((item) => {
            return (
              <EuiFlexItem key={item.id}>
                <SummaryItem
                  {...item}
                  isLoading={isLoading}
                  hasBorder={hasBorder}
                  compressed={compressed}
                />
              </EuiFlexItem>
            );
          })}
      </EuiFlexGroup>
    </>
  );

  return compressed ? (
    <>{Summary}</>
  ) : (
    <EuiAccordion
      initialIsOpen
      id="TopNFunctionsSummary"
      buttonContent={
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText color={data[0].baseColor} style={{ fontWeight: 'bold' }} textAlign="left">
              {data[0].title}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTextColor style={{ fontWeight: 'bold' }} color={data[0].baseColor}>
              {data[0].baseValue}
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {Summary}
    </EuiAccordion>
  );
}
