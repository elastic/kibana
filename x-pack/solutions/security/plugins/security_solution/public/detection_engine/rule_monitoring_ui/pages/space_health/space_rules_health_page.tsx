/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSkeletonText,
  EuiSkeletonLoading,
  EuiSkeletonTitle,
  EuiAccordion,
  EuiCodeBlock,
} from '@elastic/eui';
import type { HealthIntervalParameters } from '../../../../../common/api/detection_engine';
import { TechnicalPreviewBadge } from '../../../../common/components/technical_preview_badge';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { useSpaceRulesHealth } from '../../../rule_monitoring/logic/detection_engine_health/use_space_rules_health';
import { SectionPanel } from '../../components/section_panel';
import {
  HealthOverviewCards,
  RulesByTypeBar,
  LoggedMessagesBar,
  PerformanceSection,
  GapsAndFrozenSection,
  TopMessagesSection,
  HistoricalTrendsSection,
} from '../../components/health_overview';
import { HealthIntervalFilter } from './health_interval_filter';
import { ExecutionOutcomesChart } from '../../components/health_overview/execution_outcomes';

export const DetectionEngineSpaceRulesHealthPage = memo(
  function DetectionEngineSpaceRulesHealthPage(): JSX.Element {
    const [interval, setInterval] = useState<HealthIntervalParameters | undefined>();
    const requestBody = useMemo(() => (interval ? { interval } : {}), [interval]);
    const spaceRulesHealth = useSpaceRulesHealth(requestBody);
    const isLoading = spaceRulesHealth.isLoading || spaceRulesHealth.isFetching;

    const handleIntervalChange = useCallback((params: HealthIntervalParameters) => {
      setInterval(params);
    }, []);

    const skeleton = useMemo(
      () => (
        <>
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={2} />
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={4} />
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={3} />
          <EuiSpacer size="m" />
          <EuiSkeletonLoading
            isLoading
            loadingContent={
              <>
                <EuiSkeletonTitle />
                <EuiSkeletonText />
              </>
            }
            loadedContent={null}
          />
        </>
      ),
      []
    );

    const dashboard = useMemo(() => {
      if (!spaceRulesHealth.data) return null;

      const { health } = spaceRulesHealth.data;

      return (
        <>
          <HealthOverviewCards health={health} />

          <EuiSpacer size="l" />

          <SectionPanel title="Rules by Type">
            <RulesByTypeBar health={health} />
          </SectionPanel>

          <EuiSpacer size="l" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <SectionPanel title="Execution Outcomes (24h)">
                <ExecutionOutcomesChart health={health} />
              </SectionPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <SectionPanel title="Logged Messages by Level">
                <LoggedMessagesBar health={health} />
              </SectionPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <SectionPanel title="Performance Percentiles">
            <PerformanceSection health={health} />
          </SectionPanel>

          <EuiSpacer size="l" />

          <SectionPanel title="Gaps & Frozen Indices">
            <GapsAndFrozenSection health={health} />
          </SectionPanel>

          <EuiSpacer size="l" />

          <TopMessagesSection health={health} />

          <EuiSpacer size="l" />

          <SectionPanel title="Historical Trends">
            <HistoricalTrendsSection health={health} />
          </SectionPanel>

          <EuiSpacer size="l" />

          <EuiAccordion id="rawData" buttonContent="Raw API Response" paddingSize="m">
            <EuiCodeBlock language="json" fontSize="m" paddingSize="m">
              {JSON.stringify(spaceRulesHealth.data, null, 2)}
            </EuiCodeBlock>
          </EuiAccordion>
        </>
      );
    }, [spaceRulesHealth.data]);

    return (
      <>
        <SecuritySolutionPageWrapper>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h3>
                      {'Detection Engine Space Rules Health'} <TechnicalPreviewBadge label="" />
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <HealthIntervalFilter onChange={handleIntervalChange} disabled={isLoading} />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              {isLoading ? skeleton : dashboard}
            </EuiFlexItem>
          </EuiFlexGroup>
        </SecuritySolutionPageWrapper>

        <SpyRoute pageName={SecurityPageName.spaceRulesHealth} />
      </>
    );
  }
);
