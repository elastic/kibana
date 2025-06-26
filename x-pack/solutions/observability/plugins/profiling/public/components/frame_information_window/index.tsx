/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiAccordionProps } from '@elastic/eui';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiStat,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FrameSymbolStatus, FrameType, getFrameSymbolStatus } from '@kbn/profiling-utils';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { useCalculateImpactEstimate } from '../../hooks/use_calculate_impact_estimates';
import { FramesSummary } from '../frames_summary';
import { APMTransactions } from './apm_transactions';
import { EmptyFrame } from './empty_frame';
import { FrameInformationAIAssistant } from './frame_information_ai_assistant';
import { FrameInformationPanel } from './frame_information_panel';
import { getComparisonImpactRow } from './get_impact_rows';
import { getInformationRows } from './get_information_rows';
import { KeyValueList } from './key_value_list';
import { MissingSymbolsCallout } from './missing_symbols_callout';

export interface Frame {
  fileID: string;
  frameType: number;
  exeFileName: string;
  addressOrLine: number;
  functionName: string;
  sourceFileName: string;
  sourceLine: number;
  countInclusive: number;
  countExclusive: number;
  selfAnnualCO2Kgs: number;
  totalAnnualCO2Kgs: number;
  selfAnnualCostUSD: number;
  totalAnnualCostUSD: number;
  subGroups?: Record<string, number>;
}

export interface Props {
  comparisonFrame?: Frame;
  comparisonTotalSeconds?: number;
  comparisonTotalSamples?: number;
  comparisonRank?: number;
  frame?: Frame;
  totalSamples: number;
  totalSeconds: number;
  rank?: number;
  showSymbolsStatus?: boolean;
  compressed?: boolean;
}

export function FrameInformationWindow({
  frame,
  showSymbolsStatus = true,
  comparisonFrame,
  comparisonRank,
  comparisonTotalSamples,
  comparisonTotalSeconds,
  totalSamples,
  totalSeconds,
  rank,
  compressed = false,
}: Props) {
  const [accordionState, setAccordionState] = useState<EuiAccordionProps['forceState']>('closed');
  const calculateImpactEstimates = useCalculateImpactEstimate();

  if (!frame) {
    return <EmptyFrame />;
  }

  const symbolStatus = getFrameSymbolStatus({
    sourceFilename: frame.sourceFileName,
    sourceLine: frame.sourceLine,
    exeFileName: frame.exeFileName,
  });

  const {
    fileID,
    frameType,
    exeFileName,
    addressOrLine,
    functionName,
    sourceFileName,
    sourceLine,
    subGroups = {},
  } = frame;

  const informationRows = getInformationRows({
    fileID,
    frameType,
    exeFileName,
    addressOrLine,
    functionName,
    sourceFileName,
    sourceLine,
  });

  const impactRows = getComparisonImpactRow({
    base: {
      countInclusive: frame.countInclusive,
      countExclusive: frame.countExclusive,
      selfAnnualCO2Kgs: frame.selfAnnualCO2Kgs,
      totalAnnualCO2Kgs: frame.totalAnnualCO2Kgs,
      selfAnnualCostUSD: frame.selfAnnualCostUSD,
      totalAnnualCostUSD: frame.totalAnnualCostUSD,
      rank,
      totalSamples,
      totalSeconds,
      calculateImpactEstimates,
    },
    comparison:
      comparisonFrame &&
      comparisonTotalSamples !== undefined &&
      comparisonTotalSeconds !== undefined
        ? {
            countInclusive: comparisonFrame.countInclusive,
            countExclusive: comparisonFrame.countExclusive,
            selfAnnualCO2Kgs: comparisonFrame.selfAnnualCO2Kgs,
            totalAnnualCO2Kgs: comparisonFrame.totalAnnualCO2Kgs,
            selfAnnualCostUSD: comparisonFrame.selfAnnualCostUSD,
            totalAnnualCostUSD: comparisonFrame.totalAnnualCostUSD,
            rank: comparisonRank,
            totalSamples: comparisonTotalSamples,
            totalSeconds: comparisonTotalSeconds,
            calculateImpactEstimates,
          }
        : undefined,
  });

  return (
    <FrameInformationPanel>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            {informationRows.map((item, index) => (
              <EuiFlexItem key={index}>
                <EuiStat
                  title={
                    <span data-test-subj={`informationRows_${item['data-test-subj']}`}>
                      {item.value}
                    </span>
                  }
                  description={item.label}
                  titleSize="xs"
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
        <FrameInformationAIAssistant frame={frame} />
        {showSymbolsStatus &&
        symbolStatus !== FrameSymbolStatus.SYMBOLIZED &&
        frame.frameType < FrameType.Root ? (
          <EuiFlexItem>
            <MissingSymbolsCallout frameType={frame.frameType} />
          </EuiFlexItem>
        ) : null}
        {isEmpty(subGroups) ? null : (
          <EuiFlexItem>
            <EuiAccordion
              id="apmTransactions"
              borders="horizontal"
              buttonProps={{ paddingSize: 'm' }}
              buttonContent={
                <div>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="apmApp" />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiTitle size="xs">
                        <h3>
                          {i18n.translate(
                            'xpack.profiling.frameInformationWindow.apmTransactions',
                            { defaultMessage: 'Distributed Tracing Correlation' }
                          )}
                        </h3>
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiText size="s">
                    <p>
                      <EuiTextColor color="subdued">
                        {i18n.translate(
                          'xpack.profiling.frameInformationWindow.apmTransactions.description',
                          {
                            defaultMessage:
                              'A curated view of APM services and transactions that call this function.',
                          }
                        )}
                      </EuiTextColor>
                    </p>
                  </EuiText>
                </div>
              }
              forceState={accordionState}
              onToggle={(isOpen) => setAccordionState(isOpen ? 'open' : 'closed')}
            >
              {accordionState === 'open' ? (
                <APMTransactions functionName={functionName} serviceNames={subGroups} />
              ) : null}
            </EuiAccordion>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <FramesSummary
            compressed={compressed}
            hasBorder
            isLoading={false}
            baseValue={{
              totalCount: frame.countInclusive,
              scaleFactor: 1, // isNormalizedByTime ? baselineTime : baseline,
              totalAnnualCO2Kgs: frame.totalAnnualCO2Kgs,
              totalAnnualCostUSD: frame.totalAnnualCostUSD,
            }}
            comparisonValue={
              comparisonFrame
                ? {
                    totalCount: comparisonFrame.countInclusive,
                    scaleFactor: 1, // isNormalizedByTime ? baselineTime : baseline,
                    totalAnnualCO2Kgs: comparisonFrame.totalAnnualCO2Kgs,
                    totalAnnualCostUSD: comparisonFrame.totalAnnualCostUSD,
                  }
                : undefined
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h2>
                  {i18n.translate('xpack.profiling.frameInformationWindow.impactEstimatesTitle', {
                    defaultMessage: 'Impact estimates',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <KeyValueList data-test-subj="impactEstimates" rows={impactRows} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FrameInformationPanel>
  );
}
