/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHealth,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import type { EuiBasicTableColumn, EuiComboBoxOptionOption } from '@elastic/eui';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEqual } from 'lodash';
import type { SyntheticsCCSSettings } from '../../../../../../common/runtime_types';
import { useGetCCSSettings, DEFAULT_CCS_SETTINGS } from './hooks/use_get_ccs_settings';
import { usePutCCSSettings } from './hooks/use_put_ccs_settings';
import { useSyntheticsSettingsContext } from '../../../contexts';

interface RemoteCluster {
  name: string;
  isConnected: boolean;
}

interface ClusterUrlRow {
  clusterName: string;
  isConnected: boolean;
  kibanaUrl: string;
}

export const RemoteClustersForm = () => {
  const { http } = useKibana().services;
  const { isServerless } = useSyntheticsSettingsContext();
  const { data: savedSettings, loading: loadingSettings } = useGetCCSSettings();
  const { saveSettings, isSaving } = usePutCCSSettings();

  // Fetch available remote clusters
  const { data: remoteClusters, loading: loadingClusters } = useFetcher(async () => {
    try {
      const response = await http?.get<Array<{ name: string; isConnected: boolean }>>(
        '/api/remote_clusters'
      );
      return (response ?? []).map(
        (cluster): RemoteCluster => ({
          name: cluster.name,
          isConnected: cluster.isConnected,
        })
      );
    } catch (e) {
      return [] as RemoteCluster[];
    }
  }, [http]);

  // Local form state
  const [useAllRemoteClusters, setUseAllRemoteClusters] = useState(false);
  const [selectedRemoteClusters, setSelectedRemoteClusters] = useState<string[]>([]);
  const [remoteKibanaUrls, setRemoteKibanaUrls] = useState<Record<string, string>>({});

  // Sync local state from saved settings when loaded
  useEffect(() => {
    if (savedSettings) {
      setUseAllRemoteClusters(savedSettings.useAllRemoteClusters);
      setSelectedRemoteClusters(savedSettings.selectedRemoteClusters);
      setRemoteKibanaUrls(savedSettings.remoteKibanaUrls);
    }
  }, [savedSettings]);

  const loading = loadingSettings || loadingClusters;

  const canEdit: boolean =
    !!useKibana().services?.application?.capabilities.uptime.configureSettings || false;

  // Build the current form values for dirty checking and saving
  const currentFormValues: SyntheticsCCSSettings = useMemo(
    () => ({
      useAllRemoteClusters,
      selectedRemoteClusters,
      remoteKibanaUrls,
    }),
    [useAllRemoteClusters, selectedRemoteClusters, remoteKibanaUrls]
  );

  const isFormDirty = !isEqual(currentFormValues, savedSettings ?? DEFAULT_CCS_SETTINGS);

  const handleDiscard = useCallback(() => {
    if (savedSettings) {
      setUseAllRemoteClusters(savedSettings.useAllRemoteClusters);
      setSelectedRemoteClusters(savedSettings.selectedRemoteClusters);
      setRemoteKibanaUrls(savedSettings.remoteKibanaUrls);
    }
  }, [savedSettings]);

  const handleSave = useCallback(async () => {
    await saveSettings(currentFormValues);
  }, [saveSettings, currentFormValues]);

  // Determine which clusters to show in the Kibana URL table
  const clustersForUrlTable: ClusterUrlRow[] = useMemo(() => {
    const clusterList = remoteClusters ?? [];

    let relevantClusters: RemoteCluster[];
    if (useAllRemoteClusters) {
      relevantClusters = clusterList;
    } else {
      relevantClusters = selectedRemoteClusters.map((name) => {
        const found = clusterList.find((c) => c.name === name);
        return found ?? { name, isConnected: false };
      });
    }

    return relevantClusters.map((cluster) => ({
      clusterName: cluster.name,
      isConnected: cluster.isConnected,
      kibanaUrl: remoteKibanaUrls[cluster.name] ?? '',
    }));
  }, [remoteClusters, useAllRemoteClusters, selectedRemoteClusters, remoteKibanaUrls]);

  const handleUrlChange = useCallback((clusterName: string, url: string) => {
    setRemoteKibanaUrls((prev) => ({
      ...prev,
      [clusterName]: url,
    }));
  }, []);

  // Combo box options for cluster selection
  const clusterOptions: EuiComboBoxOptionOption[] = useMemo(() => {
    return (remoteClusters ?? []).map((cluster) => ({
      label: cluster.name,
      value: cluster.name,
      append: cluster.isConnected ? (
        <EuiHealth color="success">{CONNECTED_LABEL}</EuiHealth>
      ) : (
        <EuiHealth color="danger">{DISCONNECTED_LABEL}</EuiHealth>
      ),
    }));
  }, [remoteClusters]);

  const selectedOptions: EuiComboBoxOptionOption[] = useMemo(() => {
    return selectedRemoteClusters.map((name) => ({ label: name, value: name }));
  }, [selectedRemoteClusters]);

  // Table columns for Kibana URL mapping
  const urlTableColumns: Array<EuiBasicTableColumn<ClusterUrlRow>> = useMemo(
    () => [
      {
        field: 'clusterName',
        name: CLUSTER_NAME_LABEL,
        width: '30%',
        truncateText: false,
      },
      {
        field: 'isConnected',
        name: STATUS_LABEL,
        width: '20%',
        render: (isConnected: boolean) =>
          isConnected ? (
            <EuiHealth color="success">{CONNECTED_LABEL}</EuiHealth>
          ) : (
            <EuiHealth color="danger">{DISCONNECTED_LABEL}</EuiHealth>
          ),
      },
      {
        field: 'kibanaUrl',
        name: KIBANA_URL_LABEL,
        width: '50%',
        render: (_: string, row: ClusterUrlRow) => (
          <EuiFieldText
            data-test-subj={`syntheticsRemoteClusterUrl-${row.clusterName}`}
            placeholder="https://..."
            value={row.kibanaUrl}
            onChange={(e) => handleUrlChange(row.clusterName, e.target.value)}
            disabled={!canEdit}
            compressed
          />
        ),
      },
    ],
    [handleUrlChange, canEdit]
  );

  if (isServerless) {
    return null;
  }

  const hasNoClusters = !loading && (remoteClusters ?? []).length === 0;
  const hasSelectedClusters = useAllRemoteClusters || selectedRemoteClusters.length > 0;

  return (
    <EuiForm>
      <EuiSpacer size="m" />

      {!canEdit && (
        <>
          <EuiCallOut
            announceOnMount
            title={READ_ONLY_MESSAGE}
            iconType="lock"
            size="s"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {hasNoClusters && (
        <>
          <EuiCallOut
            title={NO_CLUSTERS_TITLE}
            iconType="iInCircle"
            color="warning"
          >
            <p>{NO_CLUSTERS_DESCRIPTION}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiDescribedFormGroup
        title={<h4>{SOURCE_SETTINGS_TITLE}</h4>}
        description={<p>{SOURCE_SETTINGS_DESCRIPTION}</p>}
      >
        <EuiFormRow label={USE_ALL_CLUSTERS_LABEL}>
          <EuiSwitch
            data-test-subj="syntheticsUseAllRemoteClusters"
            label={USE_ALL_CLUSTERS_LABEL}
            checked={useAllRemoteClusters}
            onChange={(e) => setUseAllRemoteClusters(e.target.checked)}
            disabled={!canEdit || hasNoClusters}
            showLabel={false}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={<h4>{SELECT_CLUSTERS_TITLE}</h4>}
        description={<p>{SELECT_CLUSTERS_DESCRIPTION}</p>}
      >
        <EuiFormRow label={SELECT_CLUSTERS_LABEL}>
          <EuiComboBox
            data-test-subj="syntheticsSelectRemoteClusters"
            isLoading={loading}
            options={clusterOptions}
            selectedOptions={selectedOptions}
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              setSelectedRemoteClusters(selected.map((s) => s.value as string));
            }}
            isDisabled={useAllRemoteClusters || !canEdit || hasNoClusters}
            placeholder={SELECT_CLUSTERS_PLACEHOLDER}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {hasSelectedClusters && clustersForUrlTable.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <h4>{KIBANA_URLS_TITLE}</h4>
          <EuiSpacer size="s" />
          <p>{KIBANA_URLS_DESCRIPTION}</p>
          <EuiSpacer size="m" />
          <EuiBasicTable
            data-test-subj="syntheticsRemoteClusterUrlTable"
            items={clustersForUrlTable}
            columns={urlTableColumns}
            rowHeader="clusterName"
          />
        </>
      )}

      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="syntheticsCCSSettingsDiscardButton"
            iconType="cross"
            onClick={handleDiscard}
            flush="left"
            isDisabled={!isFormDirty}
            isLoading={loading || isSaving}
          >
            {DISCARD_CHANGES}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="syntheticsCCSSettingsApplyButton"
            onClick={handleSave}
            fill
            isLoading={loading || isSaving}
            isDisabled={!isFormDirty || !canEdit}
          >
            {APPLY_CHANGES}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

// i18n labels

const USE_ALL_CLUSTERS_LABEL = i18n.translate(
  'xpack.synthetics.settings.ccs.useAllRemoteClusters',
  { defaultMessage: 'Use all remote clusters' }
);

const SOURCE_SETTINGS_TITLE = i18n.translate('xpack.synthetics.settings.ccs.sourceSettingsTitle', {
  defaultMessage: 'Source settings',
});

const SOURCE_SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.settings.ccs.sourceSettingsDescription',
  {
    defaultMessage:
      'Include monitor data from remote clusters. When enabled, monitors from remote clusters will appear alongside local monitors.',
  }
);

const SELECT_CLUSTERS_TITLE = i18n.translate(
  'xpack.synthetics.settings.ccs.selectClustersTitle',
  { defaultMessage: 'Remote clusters' }
);

const SELECT_CLUSTERS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.settings.ccs.selectClustersDescription',
  { defaultMessage: 'Select which remote clusters to include in cross-cluster search queries.' }
);

const SELECT_CLUSTERS_LABEL = i18n.translate(
  'xpack.synthetics.settings.ccs.selectClustersLabel',
  { defaultMessage: 'Select remote clusters' }
);

const SELECT_CLUSTERS_PLACEHOLDER = i18n.translate(
  'xpack.synthetics.settings.ccs.selectClustersPlaceholder',
  { defaultMessage: 'Search for remote clusters' }
);

const KIBANA_URLS_TITLE = i18n.translate('xpack.synthetics.settings.ccs.kibanaUrlsTitle', {
  defaultMessage: 'Kibana URLs',
});

const KIBANA_URLS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.settings.ccs.kibanaUrlsDescription',
  {
    defaultMessage:
      'Configure the Kibana URL for each remote cluster. These URLs are used to create deep links to remote monitor details.',
  }
);

const CLUSTER_NAME_LABEL = i18n.translate('xpack.synthetics.settings.ccs.clusterName', {
  defaultMessage: 'Cluster',
});

const STATUS_LABEL = i18n.translate('xpack.synthetics.settings.ccs.status', {
  defaultMessage: 'Status',
});

const KIBANA_URL_LABEL = i18n.translate('xpack.synthetics.settings.ccs.kibanaUrl', {
  defaultMessage: 'Kibana URL',
});

const CONNECTED_LABEL = i18n.translate('xpack.synthetics.settings.ccs.connected', {
  defaultMessage: 'Connected',
});

const DISCONNECTED_LABEL = i18n.translate('xpack.synthetics.settings.ccs.disconnected', {
  defaultMessage: 'Disconnected',
});

const NO_CLUSTERS_TITLE = i18n.translate('xpack.synthetics.settings.ccs.noClustersTitle', {
  defaultMessage: 'No remote clusters configured',
});

const NO_CLUSTERS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.settings.ccs.noClustersDescription',
  {
    defaultMessage:
      'To use cross-cluster search, configure remote clusters in Stack Management > Remote Clusters.',
  }
);

const READ_ONLY_MESSAGE = i18n.translate('xpack.synthetics.settings.ccs.readOnly', {
  defaultMessage:
    'You do not have sufficient permissions to edit these settings. Contact your administrator.',
});

const DISCARD_CHANGES = i18n.translate('xpack.synthetics.settings.ccs.discardChanges', {
  defaultMessage: 'Discard changes',
});

const APPLY_CHANGES = i18n.translate('xpack.synthetics.settings.ccs.applyChanges', {
  defaultMessage: 'Apply changes',
});
