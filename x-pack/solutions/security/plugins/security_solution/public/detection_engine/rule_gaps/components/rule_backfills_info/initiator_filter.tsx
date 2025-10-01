/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { MultiselectFilter } from '../../../../common/components/multiselect_filter';

interface InitiatorFilterProps {
  selected: Array<'user' | 'system'>;
  onChange: (initiators: Array<'user' | 'system'>) => void;
}

const items: Array<'user' | 'system'> = ['user', 'system'];

const getLabel = (initiator: 'user' | 'system') =>
  initiator === 'user' ? 'User' : 'Gap auto fill';

export const InitiatorFilter = ({ selected, onChange }: InitiatorFilterProps) => {
  const renderItem = useCallback((value: 'user' | 'system') => getLabel(value), []);

  const handleSelectionChange = useCallback(
    (values: Array<'user' | 'system'>) => {
      onChange(values.length ? values : ['user']);
    },
    [onChange]
  );

  return (
    <EuiFilterGroup>
      <MultiselectFilter<'user' | 'system'>
        data-test-subj="rule-backfills-initiator-filter"
        title={`Initiator`}
        items={items}
        selectedItems={selected}
        onSelectionChange={handleSelectionChange}
        renderItem={renderItem}
        width={200}
      />
    </EuiFilterGroup>
  );
};
