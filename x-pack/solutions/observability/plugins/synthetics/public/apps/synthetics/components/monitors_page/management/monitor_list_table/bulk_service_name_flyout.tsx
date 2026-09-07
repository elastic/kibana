/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../../common/runtime_types';
import { fetchFieldSuggestions } from '../../../../state';
import { useCanUsePublicLocationsPermission } from '../../../../../../hooks/use_capabilities';
import { BulkEditFlyout, partitionEditableMonitors, useBulkEditSubmit } from './bulk_edit_flyout';

export const BulkServiceNameFlyout = ({
  monitors,
  onClose,
  reloadPage,
}: {
  monitors: EncryptedSyntheticsSavedMonitor[];
  onClose: () => void;
  reloadPage: () => void;
}) => {
  // `undefined` means "not yet touched"; an empty string is a valid value that
  // clears the service name on the selected monitors.
  const [serviceName, setServiceName] = useState<string | undefined>(undefined);

  const canUsePublicLocations = useCanUsePublicLocationsPermission();

  const { editableMonitors, skippedMonitors } = useMemo(
    () => partitionEditableMonitors(monitors, canUsePublicLocations),
    [monitors, canUsePublicLocations]
  );

  const { data: suggestions } = useFetcher(() => fetchFieldSuggestions(), []);

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => (suggestions?.serviceNames ?? []).map((name) => ({ label: name })),
    [suggestions]
  );

  const buildAttributes = useCallback(
    (monitor: EncryptedSyntheticsSavedMonitor) => {
      const value = serviceName ?? '';
      const current = (monitor[ConfigKey.APM_SERVICE_NAME] as string | undefined) ?? '';
      if (current === value) {
        return null;
      }
      return { [ConfigKey.APM_SERVICE_NAME]: value };
    },
    [serviceName]
  );

  const { submit, isSubmitting } = useBulkEditSubmit({
    editableMonitors,
    buildAttributes,
    onClose,
    reloadPage,
    messages: {
      getSuccessMessage: (count) =>
        i18n.translate('xpack.synthetics.bulkServiceNameFlyout.success', {
          defaultMessage:
            'Service name updated for {count, plural, one {# monitor} other {# monitors}}.',
          values: { count },
        }),
      getPartialFailureMessage: (updatedCount, failedCount) =>
        i18n.translate('xpack.synthetics.bulkServiceNameFlyout.partialFailure', {
          defaultMessage:
            '{updatedCount, number} updated, {failedCount, number} failed. Check that the failed monitors are editable and try again.',
          values: { updatedCount, failedCount },
        }),
      getFailureMessage: () =>
        i18n.translate('xpack.synthetics.bulkServiceNameFlyout.failure', {
          defaultMessage: 'Failed to update service name. Please try again later.',
        }),
      noChangesMessage: i18n.translate('xpack.synthetics.bulkServiceNameFlyout.noChanges', {
        defaultMessage: 'The selected monitors already use this service name.',
      }),
    },
  });

  return (
    <BulkEditFlyout
      title={TITLE}
      description={DESCRIPTION}
      dataTestSubj="syntheticsBulkServiceNameFlyout"
      submitLabel={APPLY_LABEL}
      isSubmitDisabled={serviceName === undefined}
      isSubmitting={isSubmitting}
      editableCount={editableMonitors.length}
      skippedMonitors={skippedMonitors}
      onSubmit={submit}
      onClose={onClose}
    >
      <EuiFormRow label={SERVICE_NAME_LABEL} fullWidth helpText={HELP_TEXT}>
        <EuiComboBox
          fullWidth
          singleSelection={{ asPlainText: true }}
          data-test-subj="syntheticsBulkServiceNameComboBox"
          aria-label={SERVICE_NAME_LABEL}
          options={options}
          selectedOptions={serviceName ? [{ label: serviceName }] : []}
          onChange={(selected) => setServiceName(selected[0]?.label ?? '')}
          onCreateOption={(value) => setServiceName(value.trim())}
          customOptionText={CUSTOM_OPTION_TEXT}
          isClearable
        />
      </EuiFormRow>
    </BulkEditFlyout>
  );
};

const TITLE = i18n.translate('xpack.synthetics.bulkServiceNameFlyout.title', {
  defaultMessage: 'Edit service name',
});
const DESCRIPTION = i18n.translate('xpack.synthetics.bulkServiceNameFlyout.description', {
  defaultMessage:
    'Set the APM service name for the selected monitors. Clearing the field removes the service name.',
});
const SERVICE_NAME_LABEL = i18n.translate('xpack.synthetics.bulkServiceNameFlyout.label', {
  defaultMessage: 'Service name',
});
const HELP_TEXT = i18n.translate('xpack.synthetics.bulkServiceNameFlyout.helpText', {
  defaultMessage: 'Associates the monitors with an APM service of this name.',
});
// The literal `{searchValue}` token is interpolated by EuiComboBox, so we pass
// it through as the i18n value to keep the ICU formatter from demanding it.
const CUSTOM_OPTION_TEXT = i18n.translate('xpack.synthetics.bulkServiceNameFlyout.customOption', {
  defaultMessage: 'Add {searchValue} as a service name',
  values: { searchValue: '{searchValue}' },
});
const APPLY_LABEL = i18n.translate('xpack.synthetics.bulkServiceNameFlyout.apply', {
  defaultMessage: 'Apply changes',
});
