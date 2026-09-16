/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import { useDispatch, useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { isEqual } from 'lodash';
import { MonitorTypeEnum } from '../../../../../../common/runtime_types';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useCanManageMonitorTypes } from '../../../../../hooks/use_capabilities';
import { selectDynamicSettings } from '../../../state/settings/selectors';
import { getDynamicSettingsAction } from '../../../state/settings/actions';
import { setAllowedMonitorTypes } from '../../../state/settings/api';

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

export const MonitorTypesForm = () => {
  const dispatch = useDispatch();
  const {
    services: { notifications },
  } = useKibana<ClientPluginsStart>();

  const { settings, loading } = useSelector(selectDynamicSettings);
  const canEdit = useCanManageMonitorTypes();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    dispatch(getDynamicSettingsAction.get());
  }, [dispatch]);

  const persistedTypes = useMemo(() => settings?.allowedMonitorTypes ?? [], [settings]);

  useEffect(() => {
    setSelectedTypes(persistedTypes);
  }, [persistedTypes]);

  const options: Array<EuiComboBoxOptionOption<string>> = ALL_MONITOR_TYPES.map((type) => ({
    label: MONITOR_TYPE_LABELS[type],
    value: type,
  }));

  const isFormDirty = !isEqual([...selectedTypes].sort(), [...persistedTypes].sort());

  const onApply = async () => {
    try {
      setIsSaving(true);
      await setAllowedMonitorTypes(selectedTypes);
      notifications?.toasts.addSuccess(SAVED_TOAST);
      dispatch(getDynamicSettingsAction.get());
    } catch (e) {
      notifications?.toasts.addError(e as Error, { title: SAVE_ERROR_TOAST });
    } finally {
      setIsSaving(false);
    }
  };

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
            defaultMessage="Restrict which monitor types can be created in this space, from the UI and from project (CLI) pushes. Leave empty to allow all types."
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
            options={options}
            selectedOptions={options.filter((opt) => selectedTypes.includes(opt.value as string))}
            isDisabled={!canEdit}
            isLoading={loading}
            onChange={(selected) => {
              setSelectedTypes(selected.map((opt) => opt.value as string));
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="syntheticsMonitorTypesDiscardButton"
            iconType="cross"
            onClick={() => setSelectedTypes(persistedTypes)}
            flush="left"
            isDisabled={!isFormDirty || isSaving}
          >
            {DISCARD_CHANGES}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="syntheticsMonitorTypesApplyButton"
            onClick={onApply}
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
