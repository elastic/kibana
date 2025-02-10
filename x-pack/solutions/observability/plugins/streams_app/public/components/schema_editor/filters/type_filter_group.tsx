/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import { FilterGroup } from './filter_group';
import { FIELD_TYPE_MAP } from '../constants';
import { TControlsChangeHandler } from '../hooks/use_controls';
import { SchemaFieldType } from '../types';

const BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.fieldTypeFilterGroupButtonLabel',
  { defaultMessage: 'Type' }
);

export const FieldTypeFilterGroup = ({ onChange }: { onChange: TControlsChangeHandler }) => {
  const [items, setItems] = useState<EuiSelectableOption[]>(() =>
    Object.entries(FIELD_TYPE_MAP).map(([key, value]) => {
      return {
        label: value.label,
        key,
      };
    })
  );

  const onChangeItems = useCallback<Required<EuiSelectableProps>['onChange']>(
    (nextItems) => {
      setItems(nextItems);
      onChange({
        type: nextItems
          .filter((nextItem) => nextItem.checked === 'on')
          .map((item) => item.key as SchemaFieldType),
      });
    },
    [onChange]
  );

  return (
    <FilterGroup items={items} filterGroupButtonLabel={BUTTON_LABEL} onChange={onChangeItems} />
  );
};
