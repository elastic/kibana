/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFieldSearch, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ImpactedEntityFilterProps {
  /** Current filter value, or `undefined` when the filter is inactive. */
  value: string | undefined;
  /** Called whenever the user changes the field. `undefined` means "clear the filter". */
  onFilter: (name: string | undefined) => void;
}

/**
 * A search-field filter for narrowing the investigation list by impacted entity name.
 * Emits `undefined` when the field is empty so callers can omit the parameter entirely.
 */
export function ImpactedEntityFilter({
  value,
  onFilter,
}: ImpactedEntityFilterProps): React.ReactElement {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const trimmed = e.target.value.trim();
      onFilter(trimmed !== '' ? trimmed : undefined);
    },
    [onFilter]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.nightshift.investigations.impactedEntityFilterLabel', {
        defaultMessage: 'Filter by impacted entity',
      })}
      display="rowCompressed"
    >
      <EuiFieldSearch
        compressed
        data-test-subj="nightshiftImpactedEntityFilter"
        value={value ?? ''}
        onChange={handleChange}
        isClearable
        placeholder={i18n.translate(
          'xpack.nightshift.investigations.impactedEntityFilterPlaceholder',
          { defaultMessage: 'Entity name…' }
        )}
      />
    </EuiFormRow>
  );
}
