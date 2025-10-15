/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiTheme,
  EuiHealth,
  EuiBasicTable,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import type { PartialTheme } from '@elastic/charts';
import { Chart, Partition, Settings, PartitionLayout } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useReadinessTasksStats } from '../hooks/use_readiness_tasks_stats';
import { usePillarsProps, type PillarKey } from '../hooks/use_pillar_props';

type PillarIncludingIncomplete = PillarKey | 'incomplete';

interface LegendTableDataItem {
  pillarKey: PillarKey;
  completed: number;
  total: number;
}

interface PieChartDataItem {
  pillarKey: PillarIncludingIncomplete;
  completedTasksCount: number;
}

const PIE_CHART_SIZE = 200;
const siemReadinessPieChartChartId = 'siem-readiness-pie-chart';

const PillarsPieChart: React.FC = () => {
  const { readinessTasksStats } = useReadinessTasksStats();
  const { pillarPropsMap } = usePillarsProps();
  const { euiTheme } = useEuiTheme();

  const themeOverrides: PartialTheme = {
    partition: {
      // responsible for creating the space in the middle for the donut shape
      emptySizeRatio: 0.7,
      // responsible for removing labels from the chart nodes
      linkLabel: { maximumSection: Infinity, maxCount: 0 },
    },
  };

  const pieChartData: PieChartDataItem[] = Object.entries(readinessTasksStats.pillarStatsMap).map(
    ([pillarKey, pillarStats]): PieChartDataItem => {
      return {
        pillarKey: pillarKey as PillarKey,
        completedTasksCount: pillarStats.completed,
      };
    }
  );

  pieChartData.push({
    pillarKey: 'incomplete' as const,
    completedTasksCount: readinessTasksStats.totalIncomplete,
  });

  return (
    <div style={{ position: 'relative', width: PIE_CHART_SIZE }}>
      <Chart size={{ height: PIE_CHART_SIZE }}>
        <Settings theme={themeOverrides} ariaLabelledBy={siemReadinessPieChartChartId} />
        <Partition
          id="pillarDonut"
          data={pieChartData}
          layout={PartitionLayout.sunburst}
          valueAccessor={(d) => d.completedTasksCount}
          layers={[
            {
              groupByRollup: (d: PieChartDataItem) => d.pillarKey,
              nodeLabel: (pillarKey) => {
                if (pillarKey === 'incomplete') {
                  return i18n.translate(
                    'xpack.securitySolution.siemReadiness.incompleteTasksLabel',
                    {
                      defaultMessage: 'Incomplete',
                    }
                  );
                }

                return pillarPropsMap[pillarKey as PillarKey].displayName;
              },
              shape: {
                fillColor: (pillarKey) => {
                  if (pillarKey === 'incomplete') {
                    return euiTheme.colors.lightShade;
                  }

                  return pillarPropsMap[pillarKey as PillarKey].color;
                },
              },
            },
          ]}
        />
      </Chart>

      {/* positioning the text in the middle of the donut chart */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: euiTheme.size.xs,
          position: 'absolute',
          inset: '25%',
          height: '50%',
          width: '50%',
        }}
      >
        <EuiTitle className="eui-textCenter" size="m">
          <h1
            style={{ fontWeight: 700 }}
          >{`${readinessTasksStats.totalCompleted}/${readinessTasksStats.totalTasks}`}</h1>
        </EuiTitle>
        <EuiTitle className="eui-textCenter" size="xxs">
          <h3>
            {i18n.translate('xpack.securitySolution.siemReadiness.totalTaskCompletionScore', {
              defaultMessage: 'Total task completion score',
            })}
          </h3>
        </EuiTitle>
      </div>
    </div>
  );
};

const PillarsMiniSummaryTable: React.FC = () => {
  const { readinessTasksStats } = useReadinessTasksStats();
  const { pillarPropsMap } = usePillarsProps();

  const legendTableData: LegendTableDataItem[] = Object.entries(
    readinessTasksStats.pillarStatsMap
  ).map(([pillarKey, pillarStats]) => {
    return {
      pillarKey,
      pillarName: pillarPropsMap[pillarKey as PillarKey].displayName,
      ...pillarStats,
    };
  });

  const columns = [
    {
      field: 'pillarName',
      name: i18n.translate('xpack.securitySolution.siemReadiness.readinessSectionColumnName', {
        defaultMessage: 'Readiness Section',
      }),
      render: (pillarName: string, record: LegendTableDataItem) => (
        <EuiHealth color={pillarPropsMap[record.pillarKey as PillarKey].color}>
          {pillarName}
        </EuiHealth>
      ),
    },
    {
      field: 'score',
      name: i18n.translate('xpack.securitySolution.siemReadiness.taskScoreColumnName', {
        defaultMessage: 'Task Score',
      }),
      render: (_: unknown, record: LegendTableDataItem) => `${record.completed}/${record.total}`,
    },
  ];

  return (
    <EuiBasicTable
      tableCaption={i18n.translate(
        'xpack.securitySolution.siemReadiness.pillarTaskCompletionSummaryCaption',
        {
          defaultMessage: 'Pillar Task Completion Summary',
        }
      )}
      items={legendTableData}
      columns={columns}
      compressed
      // removes the table row borders
      css={{
        '& *': {
          borderBlock: 'none !important',
        },
      }}
    />
  );
};

const AboutSiemReadiness = () => {
  return (
    <div>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.siemReadiness.aboutSiemReadinessTitle"
            defaultMessage="About SIEM Readiness"
          />
        </h4>
      </EuiTitle>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.siemReadiness.aboutSiemReadinessDescription1"
            defaultMessage="SIEM Readiness shows how prepared your organization is to defend against threats, built on three pillars: {visibility} (data coverage), {detection} (threat rules), and {response} (ability to act)."
            values={{
              visibility: <strong>{'Visibility'}</strong>,
              detection: <strong>{'Detection'}</strong>,
              response: <strong>{'Response'}</strong>,
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.securitySolution.siemReadiness.aboutSiemReadinessDescription2"
            defaultMessage="This page highlights gaps and turns them into clear tasks. Completing these tasks improves your readiness score and strengthens your security posture. Use the task list to focus on what matters—like enabling logs, deploying endpoint protection, or activating detection rules. Learn more in our {docsLink}."
            values={{
              docsLink: (
                // TODO siem-readiness: update link to point to siem readiness docs when available
                <EuiLink href="https://www.elastic.co/guide/index.html" target="_blank" external>
                  {'docs'}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </div>
  );
};

export const ReadinessSummary = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder={true} css={{ padding: `${euiTheme.size.l} ${euiTheme.size.xxl}` }}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false} css={{ marginRight: euiTheme.size.xxl }}>
          <PillarsPieChart />
        </EuiFlexItem>
        <EuiFlexItem grow={3} css={{ alignSelf: 'center', maxWidth: 330 }}>
          <PillarsMiniSummaryTable />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <AboutSiemReadiness />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
