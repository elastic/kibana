/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DEFAULT_SESSION_REPLAY_SETTINGS,
  SELECTED_REMOTE_CLUSTERS_MAX,
  normalizeSessionReplaySettings,
  type SessionReplaySettings,
} from '../../../../common/session_replay_settings';
import type { RumRemoteCluster } from '../../../../common/rum_ccs';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumRemoteClusters } from '../../../services/rest/rum_api';
import {
  fetchSessionReplaySettings,
  updateSessionReplaySettings,
} from '../../../services/rest/session_replay_api';

export function RemoteClustersSettingsPanel() {
  const { http, notifications } = useKibanaServices();
  const [settings, setSettings] = useState<SessionReplaySettings>(DEFAULT_SESSION_REPLAY_SETTINGS);
  const [remoteClusters, setRemoteClusters] = useState<RumRemoteCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [result, remotes] = await Promise.all([
          fetchSessionReplaySettings({ http }),
          fetchRumRemoteClusters({ http }).catch(() => []),
        ]);
        if (!cancelled) {
          setSettings(result);
          setRemoteClusters(remotes);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http]);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const current = await fetchSessionReplaySettings({ http });
      const saved = await updateSessionReplaySettings({
        http,
        settings: normalizeSessionReplaySettings({
          ...current,
          useAllRemoteClusters: settings.useAllRemoteClusters,
          selectedRemoteClusters: settings.selectedRemoteClusters,
        }),
      });
      setSettings(saved);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.sessionReplaySettings.remoteClustersSaved', {
          defaultMessage: 'Remote cluster settings saved.',
        })
      );
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.sessionReplaySettings.remoteClustersSaveError', {
          defaultMessage: 'Could not save remote cluster settings',
        }),
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }, [http, notifications, settings.selectedRemoteClusters, settings.useAllRemoteClusters]);

  if (loading) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {i18n.translate('xpack.ux.sessionReplaySettings.remoteClustersLoading', {
              defaultMessage: 'Loading remote clusters…',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiPanel
      paddingSize="l"
      hasShadow={false}
      hasBorder
      css={{ maxWidth: 720 }}
      data-test-subj="uxSessionReplayRemoteClustersSettings"
    >
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.ux.sessionReplaySettings.remoteClustersDescription', {
            defaultMessage:
              'Include RUM data from selected remote clusters in User Experience, in addition to this cluster. Session and daily transforms still run only here.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiForm component="form">
        {loadError ? (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              size="s"
              title={i18n.translate('xpack.ux.sessionReplaySettings.remoteClustersLoadError', {
                defaultMessage: 'Could not load saved settings; showing defaults.',
              })}
            >
              <p>{loadError}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiFormRow
          label={i18n.translate('xpack.ux.sessionReplaySettings.useAllRemoteClustersLabel', {
            defaultMessage: 'Use all remote clusters',
          })}
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.ux.sessionReplaySettings.useAllRemoteClustersToggleSwitch',
              {
                defaultMessage: 'Search every configured remote cluster',
              }
            )}
            checked={settings.useAllRemoteClusters}
            onChange={(e) => setSettings((s) => ({ ...s, useAllRemoteClusters: e.target.checked }))}
            data-test-subj="uxSessionReplayUseAllRemoteClustersSwitch"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.ux.sessionReplaySettings.selectedRemoteClustersLabel', {
            defaultMessage: 'Select remote clusters',
          })}
          helpText={i18n.translate('xpack.ux.sessionReplaySettings.selectedRemoteClustersHelp', {
            defaultMessage:
              'Add remotes in Stack Management → Remote Clusters. Disconnected clusters are skipped at search time.',
          })}
        >
          <EuiComboBox
            isDisabled={settings.useAllRemoteClusters}
            options={remoteClusters.map((cluster) => ({
              label: cluster.isConnected
                ? cluster.name
                : i18n.translate(
                    'xpack.ux.sessionReplaySettings.disconnectedRemoteClusterDropDownOptionLabel',
                    {
                      defaultMessage: '{name} (disconnected)',
                      values: { name: cluster.name },
                    }
                  ),
              value: cluster.name,
            }))}
            selectedOptions={settings.selectedRemoteClusters.map((name) => ({
              label: name,
              value: name,
            }))}
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              setSettings((s) => ({
                ...s,
                selectedRemoteClusters: selected
                  .map((option) => option.value)
                  .filter((name): name is string => typeof name === 'string')
                  .slice(0, SELECTED_REMOTE_CLUSTERS_MAX),
              }));
            }}
            data-test-subj="uxSessionReplayRemoteClustersCombo"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiButton
          fill
          onClick={onSave}
          isLoading={saving}
          data-test-subj="uxSessionReplayRemoteClustersSaveButton"
        >
          {i18n.translate('xpack.ux.sessionReplaySettings.save', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiForm>
    </EuiPanel>
  );
}
