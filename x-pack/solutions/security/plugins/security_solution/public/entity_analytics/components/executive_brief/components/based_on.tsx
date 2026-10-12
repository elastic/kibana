/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type {
  EaCapability,
  SignalRun,
  SignalStatus,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { EXECUTIVE_BRIEF_TEST_IDS } from '../constants';

const CAPABILITY_ICONS: Record<EaCapability, string> = {
  attack_discovery: 'sparkles',
  detections: 'securitySignalDetected',
  risk_scoring: 'chartGauge',
  asset_criticality: 'flag',
  watchlists: 'eye',
  relationships: 'link',
  entity_resolution: 'merge',
  hunting_leads: 'search',
  cases: 'briefcase',
};

const STATUS_TEXT: Record<Exclude<SignalStatus, 'ok'>, string> = {
  empty: 'nothing found',
  unavailable: 'unavailable',
  timeout: 'timed out',
  error: 'failed',
};

const DEFAULT_REASONS: Record<Exclude<SignalStatus, 'ok' | 'empty'>, string> = {
  unavailable: 'This source is not available.',
  timeout: 'This source took too long to answer.',
  error: 'This source could not be read.',
};

const BASED_ON_LABEL = 'Based on';

const SignalPill: React.FC<{ signal: SignalRun }> = ({ signal }) => {
  const { id, title, capability, status, reason, factCount } = signal;
  if (status === 'ok') {
    return (
      <EuiBadge
        color="default"
        iconType={CAPABILITY_ICONS[capability]}
        data-test-subj={`executiveBriefBasedOn-${id}`}
      >
        {`${title} · ${factCount}`}
      </EuiBadge>
    );
  }
  const tooltip = status === 'empty' ? reason : reason ?? DEFAULT_REASONS[status];
  const badge = (
    <EuiBadge color="hollow" data-test-subj={`executiveBriefBasedOn-${id}-${status}`}>
      <EuiText size="xs" color="subdued" component="span">
        {`${title}: ${STATUS_TEXT[status]}`}
      </EuiText>
    </EuiBadge>
  );
  return tooltip ? (
    <EuiToolTip content={tooltip}>
      <span tabIndex={0}>{badge}</span>
    </EuiToolTip>
  ) : (
    badge
  );
};

interface BasedOnProps {
  signals: readonly SignalRun[];
}

/**
 * "Based on" row: one neutral pill per evidence source with its fact count. Sources that were
 * not used are hollow, and a tooltip says why.
 */
export const BasedOn: React.FC<BasedOnProps> = ({ signals }) => (
  <EuiFlexGroup
    gutterSize="xs"
    alignItems="center"
    wrap
    responsive={false}
    data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.basedOn}
  >
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {BASED_ON_LABEL}
      </EuiText>
    </EuiFlexItem>
    {signals.map((signal) => (
      <EuiFlexItem grow={false} key={signal.id}>
        <SignalPill signal={signal} />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
