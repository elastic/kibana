/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  useEuiTheme,
} from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { HealthIntervalParameters } from '../../../../../common/api/detection_engine';
import { TechnicalPreviewBadge } from '../../../../common/components/technical_preview_badge';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { useSpaceRulesHealth } from '../../../rule_monitoring/logic/detection_engine_health/use_space_rules_health';
import { SectionPanel } from '../../../rule_monitoring/components/section_panel';
import { DonutChart } from '../../../rule_monitoring/components/donut_chart';
import {
  HealthOverviewCards,
  RulesByTypeBar,
  LoggedMessagesBar,
  PerformanceSection,
  GapsAndFrozenSection,
  TopMessagesSection,
  HistoricalTrendsSection,
} from '../../../rule_monitoring/components/health_overview';
import { HealthIntervalFilter } from './health_interval_filter';

export const DetectionEngineSpaceRulesHealthPage = memo(
  function DetectionEngineSpaceRulesHealthPage(): JSX.Element {
    const [interval, setInterval] = useState<HealthIntervalParameters | undefined>();
    const requestBody = useMemo(() => (interval ? { interval } : {}), [interval]);
    const spaceRulesHealth = useSpaceRulesHealth(requestBody);
    const isLoading = spaceRulesHealth.isLoading || spaceRulesHealth.isFetching;
    const { euiTheme } = useEuiTheme();

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
      const numOfRules = health.state_at_the_moment.number_of_rules;
      const exec = health.stats_over_interval.number_of_executions;
      const succeeded = exec.by_outcome?.succeeded ?? 0;
      const warning = exec.by_outcome?.warning ?? 0;
      const failed = exec.by_outcome?.failed ?? 0;
      const failRate = exec.total > 0 ? ((failed / exec.total) * 100).toFixed(1) : '0';

      return (
        <>
          <HealthOverviewCards health={health} />

          <EuiSpacer size="l" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <SectionPanel title="Rules by Status">
                <DonutChart
                  id="rulesByStatus"
                  data={[
                    { label: 'Enabled', value: numOfRules.all.enabled },
                    { label: 'Disabled', value: numOfRules.all.disabled },
                  ]}
                  colors={[euiTheme.colors.vis.euiColorVis0, euiTheme.colors.vis.euiColorVis5]}
                  total={numOfRules.all.total}
                  centerLabel="Total"
                  emptyTitle="No rules"
                  emptyBody="No detection rules found."
                />
              </SectionPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <SectionPanel title="Rules by Origin">
                <DonutChart
                  id="rulesByOrigin"
                  data={[
                    {
                      label: 'Prebuilt',
                      value: numOfRules.by_origin.prebuilt?.total ?? 0,
                    },
                    {
                      label: 'Custom',
                      value: numOfRules.by_origin.custom?.total ?? 0,
                    },
                  ]}
                  colors={[euiTheme.colors.vis.euiColorVis1, euiTheme.colors.vis.euiColorVis2]}
                  total={numOfRules.all.total}
                  centerLabel="Total"
                  emptyTitle="No rules"
                  emptyBody="No detection rules found."
                />
              </SectionPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <SectionPanel title="Rules by Type">
            <RulesByTypeBar health={health} />
          </SectionPanel>

          <EuiSpacer size="l" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <SectionPanel title="Execution Outcomes (24h)">
                <DonutChart
                  id="executionOutcomes"
                  data={[
                    { label: 'Succeeded', value: succeeded },
                    { label: 'Warning', value: warning },
                    { label: 'Failed', value: failed },
                  ]}
                  colors={[
                    euiTheme.colors.vis.euiColorVis0,
                    euiTheme.colors.vis.euiColorVis5,
                    euiTheme.colors.vis.euiColorVis9,
                  ]}
                  total={exec.total}
                  centerLabel={`Fail: ${failRate}%`}
                  emptyTitle="No executions"
                  emptyBody="No executions recorded in the selected interval."
                />
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
    }, [spaceRulesHealth.data, euiTheme]);

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
