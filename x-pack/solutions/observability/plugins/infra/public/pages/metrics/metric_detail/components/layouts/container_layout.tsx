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
import { GaugesSectionVis } from '../gauges_section_vis';
import { MetadataDetails } from '../metadata_details';
import { Section } from '../section';
import { SubSection } from '../sub_section';

export const ContainerLayout = withEuiTheme(
  ({ metrics, onChangeRangeTime, theme }: LayoutPropsWithTheme) => (
    <React.Fragment>
      <MetadataDetails />
      <EuiPanel>
        <Section
          navLabel={i18n.translate(
            'xpack.infra.metricDetailPage.containerMetricsLayout.layoutLabel',
            {
              defaultMessage: 'Container',
            }
          )}
          sectionLabel={i18n.translate(
            'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.sectionLabel',
            {
              defaultMessage: 'Container Overview',
            }
          )}
          metrics={metrics}
          onChangeRangeTime={onChangeRangeTime}
        >
          <SubSection id="containerK8sOverview">
            <GaugesSectionVis
              seriesOverrides={{
                cpu: {
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                    {
                      defaultMessage: 'CPU Usage',
                    }
                  ),
                  color: theme.euiTheme.colors.fullShade,
                  formatter: 'percent',
                  gaugeMax: 1,
                },
                memory: {
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.memoryUsageSeriesLabel',
                    {
                      defaultMessage: 'Memory Usage',
                    }
                  ),
                  color: theme.euiTheme.colors.fullShade,
                  formatter: 'percent',
                  gaugeMax: 1,
                },
              }}
            />
          </SubSection>

          <SubSection id="containerOverview">
            <GaugesSectionVis
              seriesOverrides={{
                cpu: {
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.cpuUsageSeriesLabel',
                    {
                      defaultMessage: 'CPU Usage',
                    }
                  ),
                  color: theme.euiTheme.colors.fullShade,
                  formatter: 'percent',
                  gaugeMax: 1,
                },
                memory: {
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.memoryUsageSeriesLabel',
                    {
                      defaultMessage: 'Memory Usage',
                    }
                  ),
                  color: theme.euiTheme.colors.fullShade,
                  formatter: 'percent',
                  gaugeMax: 1,
                },
                rx: {
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.inboundRXSeriesLabel',
                    {
                      defaultMessage: 'Inbound (RX)',
                    }
                  ),
                  color: theme.euiTheme.colors.fullShade,
                  formatter: 'bits',
                  formatterTemplate: '{{value}}/s',
                },
                tx: {
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.overviewSection.outboundTXSeriesLabel',
                    {
                      defaultMessage: 'Outbound (TX)',
                    }
                  ),
                  color: theme.euiTheme.colors.fullShade,
                  formatter: 'bits',
                  formatterTemplate: '{{value}}/s',
                },
              }}
            />
          </SubSection>
          <SubSection
            id="containerK8sCpuUsage"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.containerMetricsLayout.cpuUsageSection.sectionLabel',
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
                cpu: { color: theme.euiTheme.colors.vis.euiColorVis1 },
              }}
            />
          </SubSection>
          <SubSection
            id="containerK8sMemoryUsage"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.containerMetricsLayout.memoryUsageSection.sectionLabel',
              {
                defaultMessage: 'Memory Usage',
              }
            )}
          >
            <ChartSectionVis
              stacked={true}
              type="area"
              formatter="percent"
              seriesOverrides={{
                memory: { color: theme.euiTheme.colors.vis.euiColorVis1 },
              }}
            />
          </SubSection>
          <SubSection
            id="containerCpuUsage"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.containerMetricsLayout.cpuUsageSection.sectionLabel',
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
                cpu: { color: theme.euiTheme.colors.vis.euiColorVis1 },
              }}
            />
          </SubSection>
          <SubSection
            id="containerMemory"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.containerMetricsLayout.memoryUsageSection.sectionLabel',
              {
                defaultMessage: 'Memory Usage',
              }
            )}
          >
            <ChartSectionVis
              stacked={true}
              type="area"
              formatter="percent"
              seriesOverrides={{
                memory: { color: theme.euiTheme.colors.vis.euiColorVis1 },
              }}
            />
          </SubSection>
          <SubSection
            id="containerNetworkTraffic"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.sectionLabel',
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
                    'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.networkRxRateSeriesLabel',
                    {
                      defaultMessage: 'in',
                    }
                  ),
                },
                tx: {
                  color: theme.euiTheme.colors.vis.euiColorVis2,
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.networkTrafficSection.networkTxRateSeriesLabel',
                    {
                      defaultMessage: 'out',
                    }
                  ),
                },
              }}
            />
          </SubSection>
          <SubSection
            id="containerDiskIOOps"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.sectionLabel',
              {
                defaultMessage: 'Disk IO (Ops)',
              }
            )}
          >
            <ChartSectionVis
              type="area"
              formatterTemplate="{{value}}/s"
              formatter="number"
              seriesOverrides={{
                read: {
                  color: theme.euiTheme.colors.vis.euiColorVis1,
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.readRateSeriesLabel',
                    {
                      defaultMessage: 'reads',
                    }
                  ),
                },
                write: {
                  color: theme.euiTheme.colors.vis.euiColorVis2,
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoOpsSection.writeRateSeriesLabel',
                    {
                      defaultMessage: 'writes',
                    }
                  ),
                },
              }}
            />
          </SubSection>
          <SubSection
            id="containerDiskIOBytes"
            label={i18n.translate(
              'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.sectionLabel',
              {
                defaultMessage: 'Disk IO (Bytes)',
              }
            )}
          >
            <ChartSectionVis
              type="area"
              formatter="bytes"
              formatterTemplate="{{value}}/s"
              seriesOverrides={{
                read: {
                  color: theme.euiTheme.colors.vis.euiColorVis1,
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.readRateSeriesLabel',
                    {
                      defaultMessage: 'reads',
                    }
                  ),
                },
                write: {
                  color: theme.euiTheme.colors.vis.euiColorVis2,
                  name: i18n.translate(
                    'xpack.infra.metricDetailPage.containerMetricsLayout.diskIoBytesSection.writeRateSeriesLabel',
                    {
                      defaultMessage: 'writes',
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
