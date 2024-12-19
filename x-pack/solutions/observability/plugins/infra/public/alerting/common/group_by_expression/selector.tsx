/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { FieldSpec } from '@kbn/data-views-plugin/common';

interface Props {
  selectedGroups?: string[];
  onChange: (groupBy: string[]) => void;
  fields: FieldSpec[];
  label: string;
  placeholder: string;
}

export const GroupBySelector = ({
  onChange,
  fields,
  selectedGroups = [],
  label,
  placeholder,
}: Props) => {
  const handleChange = useCallback(
    (selectedOptions: Array<{ label: string }>) => {
      const groupBy = selectedOptions.map((option) => option.label);
      onChange(groupBy);
    },
    [onChange]
  );

  const formattedSelectedGroups = useMemo(() => {
    return selectedGroups.map((group) => ({ label: group }));
  }, [selectedGroups]);

  const options = useMemo(() => {
    return fields.filter((field) => field.aggregatable).map((field) => ({ label: field.name }));
  }, [fields]);

  return (
    <div style={{ minWidth: '300px' }}>
      <EuiComboBox
        placeholder={placeholder}
        aria-label={label}
        fullWidth
        singleSelection={false}
        selectedOptions={formattedSelectedGroups}
        options={options}
        onChange={handleChange}
        isClearable={true}
      />
    </div>
  );
};
