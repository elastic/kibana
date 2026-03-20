/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiSwitch,
  EuiFieldNumber,
  EuiFormRow,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiSuperSelect,
  EuiRange,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import { usePipelineConfig, type PipelineConfig } from '../../hooks/pipeline/use_pipeline_api';

const STRATEGY_OPTIONS = [
  {
    value: 'strict',
    inputDisplay: 'Strict',
    dropdownDisplay: 'Strict — exact entity matches only',
  },
  {
    value: 'relaxed',
    inputDisplay: 'Relaxed',
    dropdownDisplay: 'Relaxed — partial matches accepted',
  },
  {
    value: 'weighted',
    inputDisplay: 'Weighted',
    dropdownDisplay: 'Weighted — scored by entity type importance',
  },
  {
    value: 'temporal',
    inputDisplay: 'Temporal',
    dropdownDisplay: 'Temporal — recent cases prioritized',
  },
];

export const PipelineSettings: React.FC = () => {
  const { config, loading, error, fetchConfig, updateConfig } = usePipelineConfig();
  const [localConfig, setLocalConfig] = useState<PipelineConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    if (!localConfig) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateConfig({
        enabled: localConfig.enabled,
        interval_minutes: localConfig.intervalMinutes,
        deduplication: {
          enabled: localConfig.deduplication.enabled,
          similarity_threshold: localConfig.deduplication.similarityThreshold,
          max_results: localConfig.deduplication.maxResults,
        },
        case_matching: {
          enabled: localConfig.caseMatching.enabled,
          strategy: localConfig.caseMatching.strategy,
          match_threshold: localConfig.caseMatching.matchThreshold,
          temporal_decay_days: localConfig.caseMatching.temporalDecayDays,
        },
        incremental_ad: {
          enabled: localConfig.incrementalAd.enabled,
          min_new_alerts: localConfig.incrementalAd.minNewAlerts,
          auto_trigger_on_attachment: localConfig.incrementalAd.autoTriggerOnAttachment,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // error is already set in the hook
    } finally {
      setSaving(false);
    }
  }, [localConfig, updateConfig]);

  if (loading && !localConfig) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!localConfig) {
    return (
      <EuiCallOut
        title="Unable to load pipeline configuration"
        color="warning"
        iconType="alert"
        announceOnMount={false}
      />
    );
  }

  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>{'Pipeline Configuration'}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={handleSave} isLoading={saving} fill size="s" iconType="save">
            {'Save Settings'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {error && (
        <>
          <EuiCallOut title="Error" color="danger" iconType="alert" announceOnMount>
            <p>{error}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {saveSuccess && (
        <>
          <EuiCallOut
            title="Settings saved successfully"
            color="success"
            iconType="check"
            announceOnMount
          />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFormRow>
        <EuiSwitch
          label="Enable pipeline"
          checked={localConfig.enabled}
          onChange={(e) => setLocalConfig({ ...localConfig, enabled: e.target.checked })}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label="Run interval (minutes)"
        helpText="How often the pipeline checks for new unprocessed alerts"
      >
        <EuiFieldNumber
          value={localConfig.intervalMinutes}
          min={1}
          max={1440}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              intervalMinutes: parseInt(e.target.value, 10) || 15,
            })
          }
        />
      </EuiFormRow>

      <EuiHorizontalRule margin="l" />

      <EuiTitle size="xs">
        <h3>{'Deduplication'}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow>
        <EuiSwitch
          label="Enable deduplication"
          checked={localConfig.deduplication.enabled}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              deduplication: { ...localConfig.deduplication, enabled: e.target.checked },
            })
          }
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiFormRow
        label={`Similarity threshold: ${localConfig.deduplication.similarityThreshold}`}
        helpText="Jaccard similarity score required to group alerts (0 = group everything, 1 = exact match only)"
      >
        <EuiRange
          min={0}
          max={1}
          step={0.05}
          value={localConfig.deduplication.similarityThreshold}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              deduplication: {
                ...localConfig.deduplication,
                similarityThreshold: parseFloat(e.currentTarget.value),
              },
            })
          }
          showLabels
        />
      </EuiFormRow>

      <EuiHorizontalRule margin="l" />

      <EuiTitle size="xs">
        <h3>{'Case Matching'}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow>
        <EuiSwitch
          label="Enable case matching"
          checked={localConfig.caseMatching.enabled}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              caseMatching: { ...localConfig.caseMatching, enabled: e.target.checked },
            })
          }
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiFormRow label="Matching strategy">
        <EuiSuperSelect
          options={STRATEGY_OPTIONS}
          valueOfSelected={localConfig.caseMatching.strategy}
          onChange={(value) =>
            setLocalConfig({
              ...localConfig,
              caseMatching: {
                ...localConfig.caseMatching,
                strategy: value as PipelineConfig['caseMatching']['strategy'],
              },
            })
          }
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiFormRow
        label={`Match threshold: ${localConfig.caseMatching.matchThreshold}`}
        helpText="Minimum score for an alert to be matched to an existing case"
      >
        <EuiRange
          min={0}
          max={1}
          step={0.05}
          value={localConfig.caseMatching.matchThreshold}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              caseMatching: {
                ...localConfig.caseMatching,
                matchThreshold: parseFloat(e.currentTarget.value),
              },
            })
          }
          showLabels
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiFormRow
        label="Temporal decay (days)"
        helpText="Older cases receive lower match scores. This controls the half-life."
      >
        <EuiFieldNumber
          value={localConfig.caseMatching.temporalDecayDays}
          min={1}
          max={365}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              caseMatching: {
                ...localConfig.caseMatching,
                temporalDecayDays: parseInt(e.target.value, 10) || 30,
              },
            })
          }
        />
      </EuiFormRow>

      <EuiHorizontalRule margin="l" />

      <EuiTitle size="xs">
        <h3>{'Incremental Attack Discovery'}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow>
        <EuiSwitch
          label="Enable incremental attack discovery"
          checked={localConfig.incrementalAd.enabled}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              incrementalAd: { ...localConfig.incrementalAd, enabled: e.target.checked },
            })
          }
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiFormRow
        label="Minimum new alerts to trigger"
        helpText="Number of new alerts required before triggering AD for a case"
      >
        <EuiFieldNumber
          value={localConfig.incrementalAd.minNewAlerts}
          min={1}
          max={1000}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              incrementalAd: {
                ...localConfig.incrementalAd,
                minNewAlerts: parseInt(e.target.value, 10) || 2,
              },
            })
          }
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiFormRow>
        <EuiSwitch
          label="Auto-trigger on alert attachment"
          checked={localConfig.incrementalAd.autoTriggerOnAttachment}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              incrementalAd: {
                ...localConfig.incrementalAd,
                autoTriggerOnAttachment: e.target.checked,
              },
            })
          }
        />
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiText size="xs" color="subdued">
        <p>
          {
            'Changes take effect on the next pipeline run. The pipeline processes alerts periodically based on the configured interval.'
          }
        </p>
      </EuiText>
    </EuiPanel>
  );
};
