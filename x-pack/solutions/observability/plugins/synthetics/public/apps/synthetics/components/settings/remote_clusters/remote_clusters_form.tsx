/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHealth,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';
import { isEqual } from 'lodash';
import type { SyntheticsCCSSettings } from '../../../../../../common/runtime_types';
import type { RemoteCluster } from '../../../../../../common/get_synthetics_indices';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useGetCCSSettings, DEFAULT_CCS_SETTINGS } from './hooks/use_get_ccs_settings';
import { usePutCCSSettings } from './hooks/use_put_ccs_settings';
import { useSyntheticsSettingsContext } from '../../../contexts';

export const RemoteClustersForm = () => {
  const { services } = useKibana<ClientPluginsStart>();
  const { http, spaces } = services;
  const { isServerless, isCCSEnabled } = useSyntheticsSettingsContext();
  const { data: savedSettings, loading: loadingSettings } = useGetCCSSettings();
  const { saveSettings, isSaving } = usePutCCSSettings();

  // Fetch available remote clusters
  const { data: remoteClusters, loading: loadingClusters } = useFetcher(async () => {
    try {
      const response = await http?.get<RemoteCluster[]>('/api/remote_clusters');
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
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);

  // Spaces available to the current user (from the spaces plugin), with the
  // "All spaces" pseudo-option prepended so the user can opt into wildcard sharing.
  const [availableSpaces, setAvailableSpaces] = useState<Array<{ id: string; label: string }>>([]);
  const spacesData = spaces?.ui.useSpaces();

  useEffect(() => {
    if (!spacesData?.spacesDataPromise) return;
    let cancelled = false;

    spacesData.spacesDataPromise.then(({ spacesMap }) => {
      if (cancelled) return;
      const fromSpacesPlugin = [...spacesMap].map(([spaceId, spaceData]) => ({
        id: spaceId,
        label: spaceData.name,
      }));
      setAvailableSpaces([{ id: ALL_SPACES_ID, label: ALL_SPACES_LABEL }, ...fromSpacesPlugin]);
    });

    return () => {
      cancelled = true;
    };
  }, [spacesData?.spacesDataPromise]);

  // Sync local state from saved settings when loaded
  useEffect(() => {
    if (savedSettings) {
      setUseAllRemoteClusters(savedSettings.useAllRemoteClusters);
      setSelectedRemoteClusters(savedSettings.selectedRemoteClusters);
      setSelectedSpaces(savedSettings.spaces);
    }
  }, [savedSettings]);

  const loading = loadingSettings || loadingClusters;

  const canEdit: boolean = !!services?.application?.capabilities.uptime.configureSettings;

  // Build the current form values for dirty checking and saving
  const currentFormValues = useMemo(
    () => ({
      useAllRemoteClusters,
      selectedRemoteClusters,
      spaces: selectedSpaces,
    }),
    [useAllRemoteClusters, selectedRemoteClusters, selectedSpaces]
  );

  const isFormDirty = !isEqual(currentFormValues, savedSettings ?? DEFAULT_CCS_SETTINGS);

  const handleDiscard = useCallback(() => {
    if (savedSettings) {
      setUseAllRemoteClusters(savedSettings.useAllRemoteClusters);
      setSelectedRemoteClusters(savedSettings.selectedRemoteClusters);
      setSelectedSpaces(savedSettings.spaces);
    }
  }, [savedSettings]);

  const handleSave = useCallback(async () => {
    const attributes: SyntheticsCCSSettings = {
      useAllRemoteClusters: currentFormValues.useAllRemoteClusters,
      selectedRemoteClusters: currentFormValues.selectedRemoteClusters,
    };
    // Only forward `spaces` when the user has actually selected at least one.
    // An empty selection means "no change"; the SO must always live in at least one space.
    const spacesToShare = currentFormValues.spaces.length ? currentFormValues.spaces : undefined;
    await saveSettings(attributes, spacesToShare);
  }, [saveSettings, currentFormValues]);

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

  const spaceOptions: EuiComboBoxOptionOption[] = useMemo(
    () => availableSpaces.map(({ id, label }) => ({ label, value: id })),
    [availableSpaces]
  );

  const selectedSpaceOptions: EuiComboBoxOptionOption[] = useMemo(
    () =>
      selectedSpaces.map((id) => {
        const match = availableSpaces.find((space) => space.id === id);
        return { label: match?.label ?? id, value: id };
      }),
    [availableSpaces, selectedSpaces]
  );

  if (isServerless || !isCCSEnabled) {
    return null;
  }

  const hasNoClusters = !loading && (remoteClusters ?? []).length === 0;

  return (
    <EuiForm>
      <EuiSpacer size="m" />

      {!canEdit && (
        <>
          <EuiCallOut announceOnMount title={READ_ONLY_MESSAGE} iconType="lock" size="s" />
          <EuiSpacer size="m" />
        </>
      )}

      {hasNoClusters && (
        <>
          <EuiCallOut
            announceOnMount
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

      <EuiDescribedFormGroup
        title={<h4>{SHARE_SPACES_TITLE}</h4>}
        description={<p>{SHARE_SPACES_DESCRIPTION}</p>}
      >
        <EuiFormRow label={SHARE_SPACES_LABEL} helpText={SHARE_SPACES_HELP_TEXT}>
          <EuiComboBox
            data-test-subj="syntheticsCCSSettingsSpacesSelect"
            aria-label={SHARE_SPACES_LABEL}
            options={spaceOptions}
            selectedOptions={selectedSpaceOptions}
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              setSelectedSpaces(selected.map((s) => s.value as string));
            }}
            isDisabled={!canEdit}
            placeholder={SHARE_SPACES_PLACEHOLDER}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

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

const SELECT_CLUSTERS_TITLE = i18n.translate('xpack.synthetics.settings.ccs.selectClustersTitle', {
  defaultMessage: 'Remote clusters',
});

const SELECT_CLUSTERS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.settings.ccs.selectClustersDescription',
  { defaultMessage: 'Select which remote clusters to include in cross-cluster search queries.' }
);

const SELECT_CLUSTERS_LABEL = i18n.translate('xpack.synthetics.settings.ccs.selectClustersLabel', {
  defaultMessage: 'Select remote clusters',
});

const SELECT_CLUSTERS_PLACEHOLDER = i18n.translate(
  'xpack.synthetics.settings.ccs.selectClustersPlaceholder',
  { defaultMessage: 'Search for remote clusters' }
);

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

const SHARE_SPACES_TITLE = i18n.translate('xpack.synthetics.settings.ccs.shareSpacesTitle', {
  defaultMessage: 'Spaces with access',
});

const SHARE_SPACES_DESCRIPTION = i18n.translate(
  'xpack.synthetics.settings.ccs.shareSpacesDescription',
  {
    defaultMessage:
      'These settings are shared. Choose which spaces these settings apply to. Removing a space hides the settings there. Select "All spaces" to share with every space in your deployment.',
  }
);

const SHARE_SPACES_LABEL = i18n.translate('xpack.synthetics.settings.ccs.shareSpacesLabel', {
  defaultMessage: 'Spaces',
});

const SHARE_SPACES_HELP_TEXT = i18n.translate('xpack.synthetics.settings.ccs.shareSpacesHelpText', {
  defaultMessage: 'Leave empty to keep the current sharing configuration.',
});

const SHARE_SPACES_PLACEHOLDER = i18n.translate(
  'xpack.synthetics.settings.ccs.shareSpacesPlaceholder',
  { defaultMessage: 'Select spaces' }
);

const ALL_SPACES_LABEL = i18n.translate('xpack.synthetics.settings.ccs.allSpacesLabel', {
  defaultMessage: 'All spaces',
});
