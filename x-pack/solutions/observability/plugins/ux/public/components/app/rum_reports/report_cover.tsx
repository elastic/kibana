/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { RumReportMeta } from '../../../../common/rum_report';
import { useUxPluginContext } from '../../../context/use_ux_plugin_context';
import { formatReportDate } from './format';

export function ReportCover({
  report,
  filterChips,
}: {
  report: RumReportMeta;
  filterChips: Array<{ label: string; value: string }>;
}) {
  const { spaceId } = useUxPluginContext();

  return (
    <EuiPanel hasBorder paddingSize="l" className="uxRumReportCover" data-test-subj="uxReportCover">
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" wrap>
        <EuiFlexItem className="uxRumReportCoverTitle">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoElastic" size="l" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem className="uxRumReportCoverTitle">
              <EuiTitle size="l">
                <h2>{report.title}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              {i18n.translate('xpack.ux.reports.cover.serviceLabel', {
                defaultMessage: 'Service: {service}',
                values: {
                  service:
                    report.serviceName ??
                    i18n.translate('xpack.ux.reports.cover.allServicesLabel', {
                      defaultMessage: 'All services',
                    }),
                },
              })}
            </p>
            <p>
              {i18n.translate('xpack.ux.reports.cover.periodLabel', {
                defaultMessage: '{from} → {to}',
                values: {
                  from: formatReportDate(report.rangeFrom),
                  to: formatReportDate(report.rangeTo),
                },
              })}
            </p>
            {report.compareFrom && report.compareTo && (
              <p>
                {i18n.translate('xpack.ux.reports.cover.comparedToLabel', {
                  defaultMessage: 'vs {from} → {to}',
                  values: {
                    from: formatReportDate(report.compareFrom),
                    to: formatReportDate(report.compareTo),
                  },
                })}
              </p>
            )}
            {report.noPreviousPeriod && (
              <EuiBadge color="hollow">
                {i18n.translate('xpack.ux.reports.cover.noPreviousLabel', {
                  defaultMessage: 'No previous period',
                })}
              </EuiBadge>
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" textAlign="right">
            <p>
              {i18n.translate('xpack.ux.reports.cover.generatedLabel', {
                defaultMessage: 'Generated {when}',
                values: { when: formatReportDate(report.generatedAt) },
              })}
            </p>
            {spaceId && spaceId !== 'default' && (
              <p>
                {i18n.translate('xpack.ux.reports.cover.spaceLabel', {
                  defaultMessage: 'Space: {space}',
                  values: { space: spaceId },
                })}
              </p>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {filterChips.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {filterChips.map((chip) => (
              <EuiFlexItem key={`${chip.label}-${chip.value}`} grow={false}>
                <EuiBadge>
                  {chip.label}: {chip.value}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
}
