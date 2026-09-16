/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';
import { isEqual } from 'lodash';
import { MonitorTypeEnum } from '../../../../../../common/runtime_types';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useCanManageMonitorPolicy } from '../../../../../hooks/use_capabilities';
import type { MonitorTypesPolicy } from '../../../state/settings/api';
import { getAllowedMonitorTypesPolicy, setAllowedMonitorTypes } from '../../../state/settings/api';

const MONITOR_TYPE_LABELS: Record<string, string> = {
  [MonitorTypeEnum.HTTP]: 'HTTP',
  [MonitorTypeEnum.TCP]: 'TCP',
  [MonitorTypeEnum.ICMP]: 'ICMP',
  [MonitorTypeEnum.BROWSER]: i18n.translate('xpack.synthetics.settings.monitorTypes.browser', {
    defaultMessage: 'Browser',
  }),
  [MonitorTypeEnum.API]: 'API',
};

const ALL_MONITOR_TYPES = [
  MonitorTypeEnum.HTTP,
  MonitorTypeEnum.TCP,
  MonitorTypeEnum.ICMP,
  MonitorTypeEnum.BROWSER,
  MonitorTypeEnum.API,
];

const sorted = (values: string[]) => [...values].sort();

export const MonitorTypesForm = () => {
  const { services } = useKibana<ClientPluginsStart>();
  const { spaces, notifications } = services;
  const canEdit = useCanManageMonitorPolicy();

  const [savedPolicy, setSavedPolicy] = useState<MonitorTypesPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const policy = await getAllowedMonitorTypesPolicy();
      setSavedPolicy(policy);
      setSelectedTypes(policy.allowedMonitorTypes);
      setSelectedSpaces(policy.spaces);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  // Spaces available to the current user (from the spaces plugin), with the
  // "All spaces" pseudo-option prepended so the policy can be shared with every space.
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

  const isFormDirty =
    !!savedPolicy &&
    (!isEqual(sorted(selectedTypes), sorted(savedPolicy.allowedMonitorTypes)) ||
      !isEqual(sorted(selectedSpaces), sorted(savedPolicy.spaces)));

  const handleDiscard = useCallback(() => {
    if (savedPolicy) {
      setSelectedTypes(savedPolicy.allowedMonitorTypes);
      setSelectedSpaces(savedPolicy.spaces);
    }
  }, [savedPolicy]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const spacesToShare = selectedSpaces.length ? selectedSpaces : undefined;
      await setAllowedMonitorTypes(selectedTypes, spacesToShare);
      notifications?.toasts.addSuccess(SAVED_TOAST);
      await loadPolicy();
    } catch (e) {
      notifications?.toasts.addError(e as Error, { title: SAVE_ERROR_TOAST });
    } finally {
      setIsSaving(false);
    }
  }, [selectedTypes, selectedSpaces, notifications, loadPolicy]);

  const typeOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => ALL_MONITOR_TYPES.map((type) => ({ label: MONITOR_TYPE_LABELS[type], value: type })),
    []
  );
  const selectedTypeOptions = useMemo(
    () => typeOptions.filter((opt) => selectedTypes.includes(opt.value as string)),
    [typeOptions, selectedTypes]
  );

  const spaceOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => availableSpaces.map(({ id, label }) => ({ label, value: id })),
    [availableSpaces]
  );
  const selectedSpaceOptions = useMemo(
    () =>
      selectedSpaces.map((id) => {
        const match = availableSpaces.find((space) => space.id === id);
        return { label: match?.label ?? id, value: id };
      }),
    [availableSpaces, selectedSpaces]
  );

  return (
    <EuiForm>
      <EuiSpacer size="m" />
      {!canEdit && (
        <>
          <KbnInfoCallout
            announceOnMount
            title={i18n.translate('xpack.synthetics.settings.monitorTypes.readOnly', {
              defaultMessage:
                'You do not have sufficient permissions to edit this policy. Contact your administrator.',
            })}
            size="s"
          />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.synthetics.settings.monitorTypes.title"
              defaultMessage="Allowed monitor types"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.synthetics.settings.monitorTypes.description"
            defaultMessage="Restrict which monitor types can be created, from the UI and from project (CLI) pushes. Leave empty to allow all types."
          />
        }
      >
        <EuiFormRow
          label={i18n.translate('xpack.synthetics.settings.monitorTypes.label', {
            defaultMessage: 'Monitor types',
          })}
          helpText={i18n.translate('xpack.synthetics.settings.monitorTypes.helpText', {
            defaultMessage: 'No selection means every monitor type is allowed.',
          })}
        >
          <EuiComboBox
            data-test-subj="syntheticsAllowedMonitorTypesComboBox"
            aria-label={i18n.translate('xpack.synthetics.settings.monitorTypes.ariaLabel', {
              defaultMessage: 'Select allowed monitor types',
            })}
            placeholder={i18n.translate('xpack.synthetics.settings.monitorTypes.placeholder', {
              defaultMessage: 'All monitor types allowed',
            })}
            options={typeOptions}
            selectedOptions={selectedTypeOptions}
            isDisabled={!canEdit}
            isLoading={loading}
            onChange={(selected) => setSelectedTypes(selected.map((opt) => opt.value as string))}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.synthetics.settings.monitorTypes.spacesTitle"
              defaultMessage="Spaces with this policy"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.synthetics.settings.monitorTypes.spacesDescription"
            defaultMessage="Choose which spaces this policy applies to. Select {allSpaces} to apply it to every space in your deployment. Leave empty to keep the current selection."
            values={{ allSpaces: <strong>{ALL_SPACES_LABEL}</strong> }}
          />
        }
      >
        <EuiFormRow
          label={i18n.translate('xpack.synthetics.settings.monitorTypes.spacesLabel', {
            defaultMessage: 'Spaces',
          })}
        >
          <EuiComboBox
            data-test-subj="syntheticsMonitorTypesSpacesSelect"
            aria-label={i18n.translate('xpack.synthetics.settings.monitorTypes.spacesAriaLabel', {
              defaultMessage: 'Select spaces this policy applies to',
            })}
            options={spaceOptions}
            selectedOptions={selectedSpaceOptions}
            isDisabled={!canEdit}
            isLoading={loading}
            onChange={(selected) => setSelectedSpaces(selected.map((opt) => opt.value as string))}
            placeholder={i18n.translate(
              'xpack.synthetics.settings.monitorTypes.spacesPlaceholder',
              {
                defaultMessage: 'Select spaces',
              }
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="syntheticsMonitorTypesDiscardButton"
            iconType="cross"
            onClick={handleDiscard}
            flush="left"
            isDisabled={!isFormDirty || isSaving}
          >
            {DISCARD_CHANGES}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="syntheticsMonitorTypesApplyButton"
            onClick={handleSave}
            fill
            isLoading={isSaving}
            isDisabled={!isFormDirty || !canEdit}
          >
            {APPLY_CHANGES}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

const DISCARD_CHANGES = i18n.translate('xpack.synthetics.settings.monitorTypes.discardChanges', {
  defaultMessage: 'Discard changes',
});

const APPLY_CHANGES = i18n.translate('xpack.synthetics.settings.monitorTypes.applyChanges', {
  defaultMessage: 'Apply changes',
});

const SAVED_TOAST = i18n.translate('xpack.synthetics.settings.monitorTypes.saved', {
  defaultMessage: 'Allowed monitor types updated.',
});

const SAVE_ERROR_TOAST = i18n.translate('xpack.synthetics.settings.monitorTypes.saveError', {
  defaultMessage: 'Failed to update allowed monitor types.',
});

const ALL_SPACES_LABEL = i18n.translate('xpack.synthetics.settings.monitorTypes.allSpaces', {
  defaultMessage: 'All spaces',
});
