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
  htmlIdGenerator,
  useEuiTheme,
  EuiHealth,
  EuiBasicTable,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import type { PartialTheme } from '@elastic/charts';
import { Chart, Partition, Settings, PartitionLayout } from '@elastic/charts';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useReadinessTasksStats } from '../hooks/use_readiness_tasks_stats';

interface PillarData {
  pillar: string;
  pillarName: string;
  pillarColor: string;
  completed: number;
  total: number;
}

interface ChartDataItem {
  pillar: string;
  count: number;
  color: string;
}

const PillarsPieChart: React.FC = () => {
  const { readinessTasksStats } = useReadinessTasksStats();
  const { euiTheme } = useEuiTheme();
  const { charts } = useKibana<CoreStart>().services;
  const htmlId = htmlIdGenerator();
  const chartId = htmlId();

  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const themeOverrides: PartialTheme = {
    partition: {
      // responsible for creating the space in the middle for the donut shape
      emptySizeRatio: 0.7,
      // responsible for removing labels from the chart nodes
      linkLabel: { maximumSection: Infinity, maxCount: 0 },
    },
  };

  return (
    <div style={{ position: 'relative', width: 200 }}>
      <Chart size={{ height: 200 }}>
        <Settings baseTheme={chartBaseTheme} theme={themeOverrides} ariaLabelledBy={chartId} />
        <Partition
          id="pillarDonut"
          data={readinessTasksStats.chartData}
          layout={PartitionLayout.sunburst}
          valueAccessor={(d) => d.count}
          layers={[
            {
              groupByRollup: (d: ChartDataItem) => d.pillar,
              shape: {
                fillColor: (groupName) => {
                  return readinessTasksStats.chartData.find((d) => d.pillar === groupName)?.color;
                },
              },
            },
          ]}
        />
      </Chart>

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
        <EuiTitle className="eui-textCenter" size="m" style={{ fontWeight: 700 }}>
          <h1>{`${readinessTasksStats.totalCompleted}/${readinessTasksStats.totalTasks}`}</h1>
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

  const columns = [
    {
      field: 'pillarName',
      name: i18n.translate('xpack.securitySolution.siemReadiness.readinessSectionColumnName', {
        defaultMessage: 'Readiness Section',
      }),
      render: (pillarName: string, record: PillarData) => (
        <EuiHealth color={record.pillarColor}>{pillarName}</EuiHealth>
      ),
    },
    {
      field: 'score',
      name: i18n.translate('xpack.securitySolution.siemReadiness.taskScoreColumnName', {
        defaultMessage: 'Task Score',
      }),
      render: (_: unknown, record: PillarData) => `${record.completed}/${record.total}`,
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
      items={readinessTasksStats.pillarsData}
      columns={columns}
      compressed
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
  return (
    <EuiPanel hasBorder={true} style={{ padding: '20px 40px' }}>
      <EuiFlexGroup style={{ gap: 40 }}>
        <EuiFlexItem grow={false}>
          <PillarsPieChart />
        </EuiFlexItem>
        <EuiFlexItem grow={3} style={{ alignSelf: 'center' }}>
          <PillarsMiniSummaryTable />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <AboutSiemReadiness />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
