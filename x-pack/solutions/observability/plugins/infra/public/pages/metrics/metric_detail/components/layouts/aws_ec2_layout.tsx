/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, withEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { LayoutPropsWithTheme } from '../../types';
import { ChartSectionVis } from '../chart_section_vis';
import { MetadataDetails } from '../metadata_details';
import { Section } from '../section';
import { SubSection } from '../sub_section';

export const AwsEC2Layout = withEuiTheme(
  ({ metrics, theme, onChangeRangeTime }: LayoutPropsWithTheme) => (
    <React.Fragment>
      <MetadataDetails
        fields={[
          'cloud.instance.id',
          'cloud.provider',
          'cloud.availability_zone',
          'cloud.machine.type',
          'cloud.instance.name',
          'cloud.project.id',
        ]}
      />
      <EuiPanel>
        <Section
          navLabel="AWS EC2"
          sectionLabel={i18n.translate(
            'xpack.infra.metricDetailPage.ec2MetricsLayout.overviewSection.sectionLabel',
            {
              defaultMessage: 'Aws EC2 Overview',
            }
          )}
          metrics={metrics}
          onChangeRangeTime={onChangeRangeTime}
        >
          <SubSection
            id="awsEC2CpuUtilization"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.ec2MetricsLayout.cpuUsageSection.sectionLabel',
              {
                defaultMessage: 'CPU Usage',
              }
            )}
          >
            <ChartSectionVis
              stacked={true}
              type="area"
              formatter="percent"
              seriesOverrides={{
                total: { color: theme.euiTheme.colors.vis.euiColorVis1 },
              }}
            />
          </SubSection>
          <SubSection
            id="awsEC2NetworkTraffic"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.ec2MetricsLayout.networkTrafficSection.sectionLabel',
              {
                defaultMessage: 'Network Traffic',
              }
            )}
          >
            <ChartSectionVis
              formatter="bits"
              formatterTemplate="{{value}}/s"
              type="area"
              seriesOverrides={{
                rx: {
                  color: theme.euiTheme.colors.vis.euiColorVis1,
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.networkRxRateSeriesLabel',
                    {
                      defaultMessage: 'in',
                    }
                  ),
                },
                tx: {
                  color: theme.euiTheme.colors.vis.euiColorVis2,
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.hostMetricsLayout.networkTrafficSection.networkTxRateSeriesLabel',
                    {
                      defaultMessage: 'out',
                    }
                  ),
                },
              }}
            />
          </SubSection>
          <SubSection
            id="awsEC2DiskIOBytes"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.ec2MetricsLayout.diskIOBytesSection.sectionLabel',
              {
                defaultMessage: 'Disk IO (Bytes)',
              }
            )}
          >
            <ChartSectionVis
              formatter="bytes"
              formatterTemplate="{{value}}/s"
              type="area"
              seriesOverrides={{
                write: {
                  color: theme.euiTheme.colors.vis.euiColorVis2,
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.ec2MetricsLayout.diskIOBytesSection.writeLabel',
                    {
                      defaultMessage: 'writes',
                    }
                  ),
                },
                read: {
                  color: theme.euiTheme.colors.vis.euiColorVis1,
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.ec2MetricsLayout.diskIOBytesSection.readLabel',
                    {
                      defaultMessage: 'reads',
                    }
                  ),
                },
              }}
            />
          </SubSection>
        </Section>
      </EuiPanel>
    </React.Fragment>
  )
);
