/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type {
  AffectedMonitorReason,
  AffectedMonitorsResult,
} from '../../../../../../common/runtime_types';
import { previewAffectedMonitors } from '../../../state/settings/api';

const PREVIEW_DEBOUNCE_MS = 400;

const AFFECTED_REASON_LABELS: Record<AffectedMonitorReason, string> = {
  monitor_type: i18n.translate('xpack.synthetics.secretConnection.affectedReason.monitorType', {
    defaultMessage: 'browser monitor',
  }),
  redirects: i18n.translate('xpack.synthetics.secretConnection.affectedReason.redirects', {
    defaultMessage: 'follows redirects',
  }),
  host: i18n.translate('xpack.synthetics.secretConnection.affectedReason.host', {
    defaultMessage: 'other host',
  }),
};

const AffectedMonitorsList = ({ result }: { result: AffectedMonitorsResult }) => (
  <ul data-test-subj="syntheticsVaultAffectedMonitorsList">
    {result.monitors.map(({ name, reason }) => (
      <li key={name}>
        {name} ({AFFECTED_REASON_LABELS[reason]})
      </li>
    ))}
    {result.total > result.monitors.length && (
      <li>
        {i18n.translate('xpack.synthetics.secretConnection.affectedMonitorsMore', {
          defaultMessage: 'and {count} more',
          values: { count: result.total - result.monitors.length },
        })}
      </li>
    )}
  </ul>
);

/** Warning for the flyout: which monitors would report down with these allowed hosts. */
export const AffectedMonitorsCallout = ({ result }: { result: AffectedMonitorsResult }) => (
  <KbnWarningCallout
    size="s"
    data-test-subj="syntheticsVaultAffectedMonitorsCallout"
    title={i18n.translate('xpack.synthetics.secretConnection.affectedMonitorsTitle', {
      defaultMessage:
        '{total, plural, one {# monitor} other {# monitors}} will report down with these hosts',
      values: { total: result.total },
    })}
  >
    <AffectedMonitorsList result={result} />
    <p>
      {i18n.translate('xpack.synthetics.secretConnection.affectedMonitorsExplanation', {
        defaultMessage:
          'Browser monitors, monitors that follow redirects and monitors that target a host that is not on the list cannot use a connection with allowed monitor hosts.',
      })}
    </p>
  </KbnWarningCallout>
);

/** Badge for the connection table: how many monitors report down, with the names in a tooltip. */
export const AffectedMonitorsBadge = ({ result }: { result: AffectedMonitorsResult }) => (
  <EuiToolTip content={<AffectedMonitorsList result={result} />}>
    <EuiBadge
      color="warning"
      iconType="warning"
      tabIndex={0}
      data-test-subj="syntheticsVaultAffectedMonitorsBadge"
    >
      {i18n.translate('xpack.synthetics.secretConnection.affectedMonitorsBadge', {
        defaultMessage: '{total, plural, one {# monitor} other {# monitors}} down',
        values: { total: result.total },
      })}
    </EuiBadge>
  </EuiToolTip>
);

interface PreviewState {
  result?: AffectedMonitorsResult;
  failed: boolean;
}

/**
 * The monitors the hosts being edited would affect, asked for shortly after the list stops
 * changing. Nothing is asked while the list is empty (any host is allowed).
 */
export const useAffectedMonitorsPreview = (name: string, hosts: string[]): PreviewState => {
  const [state, setState] = useState<PreviewState>({ failed: false });
  const hostsKey = hosts.join('\n');

  useEffect(() => {
    if (!name || !hostsKey) {
      setState({ failed: false });
      return;
    }
    // A response for hosts that have since changed is dropped.
    let isCurrent = true;
    const timer = setTimeout(async () => {
      try {
        const result = await previewAffectedMonitors({
          name,
          allowedMonitorHosts: hostsKey.split('\n'),
        });
        if (isCurrent) setState({ result, failed: false });
      } catch {
        if (isCurrent) setState({ failed: true });
      }
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [name, hostsKey]);

  return state;
};

/** What the flyout shows under the hosts field for a preview. */
export const AffectedMonitorsPreview = ({ state }: { state: PreviewState }) => {
  if (state.failed) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="syntheticsVaultAffectedMonitorsFailed">
        {i18n.translate('xpack.synthetics.secretConnection.affectedMonitorsFailed', {
          defaultMessage: 'Could not check which monitors are affected.',
        })}
      </EuiText>
    );
  }
  if (!state.result) return null;
  if (state.result.total > 0) return <AffectedMonitorsCallout result={state.result} />;
  return (
    <EuiText size="s" color="subdued" data-test-subj="syntheticsVaultAffectedMonitorsNone">
      {i18n.translate('xpack.synthetics.secretConnection.affectedMonitorsNone', {
        defaultMessage: 'No existing monitors using this connection are affected.',
      })}
    </EuiText>
  );
};
