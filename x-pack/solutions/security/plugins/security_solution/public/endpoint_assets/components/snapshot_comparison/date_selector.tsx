/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { SnapshotInfo } from '../../../../common/endpoint_assets';

interface DateSelectorProps {
  label: string;
  availableDates: SnapshotInfo[];
  selectedDate: string | null;
  onChange: (date: string | null) => void;
  isLoading?: boolean;
}

export const DateSelector: React.FC<DateSelectorProps> = React.memo(
  ({ label, availableDates, selectedDate, onChange, isLoading = false }) => {
    const options = useMemo(() => {
      const dateOptions = availableDates.map((snapshot) => {
        // Format date for display: "Jan 14, 2026 (150 assets)"
        const date = new Date(snapshot.date);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return {
          value: snapshot.date,
          text: `${formattedDate} (${snapshot.document_count} assets)`,
        };
      });

      return [{ value: '', text: 'Select a date...' }, ...dateOptions];
    }, [availableDates]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        onChange(value || null);
      },
      [onChange]
    );

    return (
      <EuiFormRow label={label}>
        <EuiSelect
          options={options}
          value={selectedDate ?? ''}
          onChange={handleChange}
          isLoading={isLoading}
          disabled={availableDates.length === 0}
        />
      </EuiFormRow>
    );
  }
);

DateSelector.displayName = 'DateSelector';
