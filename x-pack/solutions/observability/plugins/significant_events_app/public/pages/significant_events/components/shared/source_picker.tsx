/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import React from 'react';

interface SourcePickerProps {
  sources: NightshiftSource[];
  isSourcesLoading: boolean;
  selectedSourceIds: string[];
  onSelectedSourceIdsChange: (sourceIds: string[]) => void;
  excludedSourceIds?: string[];
  isDisabled?: boolean;
  fullWidth?: boolean;
}

/** Picks the sources to onboard. Disabled sources are left out: onboarding rejects them. */
export function SourcePicker({
  sources,
  isSourcesLoading,
  selectedSourceIds,
  onSelectedSourceIdsChange,
  excludedSourceIds = [],
  isDisabled,
  fullWidth,
}: SourcePickerProps) {
  const toOption = ({ id, title }: NightshiftSource): EuiComboBoxOptionOption<string> => ({
    label: title,
    key: id,
    value: id,
  });

  const options = sources
    .filter(({ id, enabled }) => enabled && !excludedSourceIds.includes(id))
    .map(toOption);
  const selectedOptions = sources.filter(({ id }) => selectedSourceIds.includes(id)).map(toOption);

  return (
    <EuiComboBox
      data-test-subj="significantEventsAppSourcePicker"
      aria-label={SOURCE_PICKER_ARIA_LABEL}
      placeholder={SOURCE_PICKER_PLACEHOLDER}
      options={options}
      selectedOptions={selectedOptions}
      onChange={(nextOptions) =>
        onSelectedSourceIdsChange(nextOptions.flatMap(({ value }) => (value ? [value] : [])))
      }
      isLoading={isSourcesLoading}
      isDisabled={isDisabled}
      fullWidth={fullWidth}
      isClearable
    />
  );
}

const SOURCE_PICKER_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.sources.pickerAriaLabel',
  {
    defaultMessage: 'Select sources to generate knowledge indicators for',
  }
);

const SOURCE_PICKER_PLACEHOLDER = i18n.translate(
  'xpack.significantEventsApp.sources.pickerPlaceholder',
  {
    defaultMessage: 'Select sources...',
  }
);
