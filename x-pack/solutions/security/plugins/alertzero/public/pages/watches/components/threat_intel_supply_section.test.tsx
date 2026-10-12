/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { HuntThreatIntelSupplyStatus } from '@kbn/alertzero-common';
import { ThreatIntelSupplySectionView } from './threat_intel_supply_section';

const baseStatus = (): HuntThreatIntelSupplyStatus => ({
  huntEnabled: true,
  drift: false,
  hardGate: { ok: true, reasonCodes: [] },
  workflows: [
    {
      key: 'ingest',
      workflowId: 'system-security-threat-intel-ingest-feeds',
      enabled: true,
      installed: true,
      scope: 'deployment',
    },
    {
      key: 'enrich',
      workflowId: 'system-security-threat-intel-enrich-report',
      enabled: true,
      installed: true,
      scope: 'deployment',
    },
    {
      key: 'attribute',
      workflowId: 'system-security-threat-intel-attribute-alerts-default',
      enabled: true,
      installed: true,
      scope: 'space',
    },
  ],
});

const renderView = (
  status: HuntThreatIntelSupplyStatus | undefined,
  {
    isLoading = false,
    isError = false,
    onRestore = jest.fn(),
  }: { isLoading?: boolean; isError?: boolean; onRestore?: () => void } = {}
) => {
  render(
    <I18nProvider>
      <ThreatIntelSupplySectionView
        status={status}
        isLoading={isLoading}
        isError={isError}
        canWrite
        isSaving={false}
        isRestoring={false}
        onRestore={onRestore}
      />
    </I18nProvider>
  );
  return { onRestore };
};

describe('ThreatIntelSupplySectionView', () => {
  it('renders a status row for each TI workflow', () => {
    renderView(baseStatus());
    expect(screen.getByTestId('alertZeroThreatIntelSupplyRow-ingest')).toBeInTheDocument();
  });

  it('shows the Restore button when Hunt is on and supply has drifted', () => {
    const status = baseStatus();
    status.drift = true;
    status.workflows[0].enabled = false;
    renderView(status);
    expect(screen.getByTestId('alertZeroThreatIntelSupplyRestoreButton')).toBeInTheDocument();
  });

  it('calls onRestore when the Restore button is clicked', () => {
    const status = baseStatus();
    status.drift = true;
    const { onRestore } = renderView(status);
    fireEvent.click(screen.getByTestId('alertZeroThreatIntelSupplyRestoreButton'));
    expect(onRestore).toHaveBeenCalled();
  });

  it('shows the hard-gate callout when embeddings are unavailable', () => {
    const status = baseStatus();
    status.hardGate = { ok: false, reasonCodes: ['embedding_endpoint_unavailable'] };
    renderView(status);
    expect(screen.getByTestId('alertZeroThreatIntelSupplyHardGateCallout')).toBeInTheDocument();
  });

  it('shows in-use elsewhere copy on a deployment row when flagged', () => {
    const status = baseStatus();
    status.huntEnabled = false;
    status.workflows[0].inUseElsewhere = true;
    renderView(status);
    expect(
      screen.getByTestId('alertZeroThreatIntelSupplyInUseElsewhere-ingest')
    ).toBeInTheDocument();
  });

  it('shows a status-error callout when the supply status request fails', () => {
    renderView(undefined, { isError: true });
    expect(screen.getByTestId('alertZeroThreatIntelSupplyStatusErrorCallout')).toBeInTheDocument();
  });
});
