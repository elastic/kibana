/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import React, { useState } from 'react';

export interface GroupValue {
  field: string;
  value: string;
}

interface Props {
  availableGroups: GroupValue[];
  groups: GroupValue[];
  onChange: (groups: GroupValue[]) => void;
}

export function GroupsFilter({ availableGroups, groups, onChange }: Props) {
  const [selected, setSelected] = useState<GroupValue[]>(groups);

  return (
    <EuiFormRow label="Groups">
      <EuiComboBox<GroupValue>
        compressed
        placeholder="Select related groups"
        selectedOptions={selected.map((group) => ({ label: toLabel(group), value: group }))}
        options={availableGroups.map((group) => ({ label: toLabel(group), value: group }))}
        onChange={(selectedOptions) => {
          const newGroups = selectedOptions.map((opt) => opt.value!);
          setSelected(newGroups);
          onChange(newGroups);
        }}
        isClearable={true}
      />
    </EuiFormRow>
  );
}

function toLabel(group: GroupValue) {
  return `${group.field}: ${group.value}`;
}
