/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  CrashBreakdown,
  MobileCrashGroupDetailResponse,
} from '../../../../common/types/mobile';
import { useFormatters } from '../../../hooks/use_formatters';

type BreakdownName = 'releases' | 'osVersions' | 'deviceModels';

const BREAKDOWN_TITLES: Record<BreakdownName, string> = {
  releases: i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.releases', {
    defaultMessage: 'App version',
  }),
  osVersions: i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.osVersions', {
    defaultMessage: 'OS version',
  }),
  deviceModels: i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.deviceModels', {
    defaultMessage: 'Device model',
  }),
};

const shareLabel = (value: string, share: string) =>
  i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.shareLabel', {
    defaultMessage: '{value}: {share} of the crashes',
    values: { value, share },
  });

const OTHER_LABEL = i18n.translate('xpack.digitalExperience.mobile.crashes.flyout.other', {
  defaultMessage: 'Other',
});

/** One breakdown: its values with their crashes and share, and the rest as "Other". */
function Breakdown({ name, breakdown }: { name: BreakdownName; breakdown: CrashBreakdown }) {
  const { formatNumber, formatPercent } = useFormatters();
  const rows = [
    ...breakdown.top,
    ...(breakdown.other > 0 ? [{ key: OTHER_LABEL, count: breakdown.other }] : []),
  ];
  const total = rows.reduce((sum, { count }) => sum + count, 0);

  return (
    <div data-test-subj={`digitalExperienceMobileCrashBreakdown-${name}`}>
      <EuiTitle size="xxs">
        <h3>{BREAKDOWN_TITLES[name]}</h3>
      </EuiTitle>
      {rows.map(({ key, count }) => (
        <div key={key}>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
            <EuiFlexItem className="eui-textTruncate">
              <EuiText size="xs" className="eui-textTruncate" title={key}>
                {key}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {`${formatNumber(count)} · ${formatPercent(total ? count / total : 0)}`}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiProgress
            value={count}
            max={total || 1}
            size="xs"
            color="primary"
            aria-label={shareLabel(key, formatPercent(total ? count / total : 0))}
          />
        </div>
      ))}
    </div>
  );
}

/** A crash group's crashes by app version, OS version and device model. */
export function CrashBreakdowns({
  detail,
}: {
  detail: Pick<MobileCrashGroupDetailResponse, BreakdownName>;
}) {
  return (
    <EuiFlexGrid columns={3} gutterSize="l">
      {(['releases', 'osVersions', 'deviceModels'] as const).map((name) => (
        <EuiFlexItem key={name}>
          <Breakdown name={name} breakdown={detail[name]} />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
}
