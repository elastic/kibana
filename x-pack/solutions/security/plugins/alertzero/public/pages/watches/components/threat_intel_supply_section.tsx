/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { HuntThreatIntelSupplyStatus } from '@kbn/alertzero-common';
import {
  useHuntThreatIntelSupplyStatus,
  useRestoreHuntThreatIntelSupply,
} from '../../../hooks/use_hunt_threat_intel_supply';
import { SettingRow } from './setting_row';
import * as settingsI18n from '../settings_translations';

interface ThreatIntelSupplySectionProps {
  canWrite: boolean;
  isSaving: boolean;
  /** Called so the parent can disable Enabled when hard-gate fails. */
  onHardGateChange?: (ok: boolean) => void;
}

const scopeLabel = (scope: 'deployment' | 'space'): string =>
  scope === 'deployment'
    ? settingsI18n.THREAT_INTEL_SUPPLY_SCOPE_DEPLOYMENT
    : settingsI18n.THREAT_INTEL_SUPPLY_SCOPE_SPACE;

const rowLabel = (key: HuntThreatIntelSupplyStatus['workflows'][number]['key']): string => {
  switch (key) {
    case 'ingest':
      return settingsI18n.THREAT_INTEL_SUPPLY_INGEST_LABEL;
    case 'enrich':
      return settingsI18n.THREAT_INTEL_SUPPLY_ENRICH_LABEL;
    case 'attribute':
      return settingsI18n.THREAT_INTEL_SUPPLY_ATTRIBUTE_LABEL;
  }
};

const hardGateMessage = (reasonCodes: string[]): string => {
  if (reasonCodes.includes('embedding_endpoint_unavailable')) {
    return settingsI18n.THREAT_INTEL_SUPPLY_HARD_GATE_EMBEDDING;
  }
  if (
    reasonCodes.includes('reports_index_missing') ||
    reasonCodes.includes('reports_index_check_failed')
  ) {
    return settingsI18n.THREAT_INTEL_SUPPLY_HARD_GATE_BLOCKED;
  }
  return settingsI18n.THREAT_INTEL_SUPPLY_HARD_GATE_EMBEDDING;
};

interface ThreatIntelSupplySectionViewProps {
  status: HuntThreatIntelSupplyStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  canWrite: boolean;
  isSaving: boolean;
  isRestoring: boolean;
  onRestore: () => void;
}

const ThreatIntelSupplySectionViewComponent: React.FC<ThreatIntelSupplySectionViewProps> = ({
  status,
  isLoading,
  isError,
  canWrite,
  isSaving,
  isRestoring,
  onRestore,
}) => {
  if (isLoading && !status && !isError) {
    return (
      <SettingRow
        label={settingsI18n.THREAT_INTEL_SUPPLY_SECTION_TITLE}
        data-test-subj="alertZeroThreatIntelSupplySection"
      >
        <EuiLoadingSpinner size="m" data-test-subj="alertZeroThreatIntelSupplyLoading" />
      </SettingRow>
    );
  }

  if (isError && !status) {
    return (
      <SettingRow
        label={settingsI18n.THREAT_INTEL_SUPPLY_SECTION_TITLE}
        labelHelp={settingsI18n.THREAT_INTEL_SUPPLY_SECTION_SUBTITLE}
        data-test-subj="alertZeroThreatIntelSupplySection"
      >
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          iconType="warning"
          data-test-subj="alertZeroThreatIntelSupplyStatusErrorCallout"
        >
          {settingsI18n.THREAT_INTEL_SUPPLY_STATUS_ERROR}
        </EuiCallOut>
      </SettingRow>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <SettingRow
      label={settingsI18n.THREAT_INTEL_SUPPLY_SECTION_TITLE}
      labelHelp={settingsI18n.THREAT_INTEL_SUPPLY_SECTION_SUBTITLE}
      data-test-subj="alertZeroThreatIntelSupplySection"
    >
      {isError ? (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="warning"
            data-test-subj="alertZeroThreatIntelSupplyStatusErrorCallout"
          >
            {settingsI18n.THREAT_INTEL_SUPPLY_STATUS_ERROR}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      ) : null}
      {!status.hardGate.ok ? (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="warning"
            data-test-subj="alertZeroThreatIntelSupplyHardGateCallout"
          >
            {hardGateMessage(status.hardGate.reasonCodes)}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      ) : null}
      {status.drift && status.huntEnabled ? (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="warning"
            data-test-subj="alertZeroThreatIntelSupplyDriftCallout"
          >
            <p>{settingsI18n.THREAT_INTEL_SUPPLY_DRIFT_MESSAGE}</p>
            <EuiButton
              size="s"
              fill
              disabled={!canWrite || isSaving || isRestoring}
              isLoading={isRestoring}
              onClick={onRestore}
              data-test-subj="alertZeroThreatIntelSupplyRestoreButton"
            >
              {settingsI18n.THREAT_INTEL_SUPPLY_RESTORE_LABEL}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        {status.workflows.map((row) => (
          <EuiFlexItem key={row.key} grow={false}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              wrap
              data-test-subj={`alertZeroThreatIntelSupplyRow-${row.key}`}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <p css={{ margin: 0 }}>
                    {rowLabel(row.key)}{' '}
                    <span css={{ color: 'inherit', opacity: 0.7 }}>({scopeLabel(row.scope)})</span>
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color={row.enabled ? 'success' : 'hollow'}
                  data-test-subj={`alertZeroThreatIntelSupplyRowEnabled-${row.key}`}
                >
                  {row.enabled
                    ? settingsI18n.THREAT_INTEL_SUPPLY_ON
                    : settingsI18n.THREAT_INTEL_SUPPLY_OFF}
                </EuiBadge>
              </EuiFlexItem>
              {row.inUseElsewhere ? (
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj={`alertZeroThreatIntelSupplyInUseElsewhere-${row.key}`}
                  >
                    <p css={{ margin: 0 }}>{settingsI18n.THREAT_INTEL_SUPPLY_IN_USE_ELSEWHERE}</p>
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </SettingRow>
  );
};

export const ThreatIntelSupplySectionView = React.memo(ThreatIntelSupplySectionViewComponent);

const ThreatIntelSupplySectionComponent: React.FC<ThreatIntelSupplySectionProps> = ({
  canWrite,
  isSaving,
  onHardGateChange,
}) => {
  const { data, isLoading, isError } = useHuntThreatIntelSupplyStatus(true);
  const restore = useRestoreHuntThreatIntelSupply();

  useEffect(() => {
    if (!onHardGateChange) {
      return;
    }
    // Parent defaults hardGateOk to false, so Enable stays locked until status arrives.
    if (isError || !data) {
      onHardGateChange(false);
      return;
    }
    onHardGateChange(data.hardGate.ok);
  }, [data, isError, onHardGateChange]);

  const handleRestore = useCallback(() => {
    restore.mutate();
  }, [restore]);

  return (
    <ThreatIntelSupplySectionView
      status={data}
      isLoading={isLoading}
      isError={isError}
      canWrite={canWrite}
      isSaving={isSaving}
      isRestoring={restore.isLoading}
      onRestore={handleRestore}
    />
  );
};

export const ThreatIntelSupplySection = React.memo(ThreatIntelSupplySectionComponent);
