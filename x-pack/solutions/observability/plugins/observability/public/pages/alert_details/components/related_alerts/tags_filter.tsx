/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import React, { useState } from 'react';

interface Props {
  availableTags: string[];
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagsFilter({ availableTags, tags, onChange }: Props) {
  const [selected, setSelected] = useState<string[]>(tags);

  return (
    <EuiFormRow label="Tags">
      <EuiComboBox<string>
        compressed
        placeholder="Select related tags"
        selectedOptions={selected.map((tag) => ({ label: tag, value: tag }))}
        options={availableTags.map((tag) => ({ label: tag, value: tag }))}
        onChange={(selectedOptions) => {
          const newTags = selectedOptions.map((opt) => opt.value!);
          setSelected(newTags);
          onChange(newTags);
        }}
        isClearable={true}
      />
    </EuiFormRow>
  );
}
