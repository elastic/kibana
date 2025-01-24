/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiSelectableProps } from '@elastic/eui';
import { FIELD_STATUS_MAP } from '../configuration_maps';
import { FilterGroup } from './filter_group';
import { ChangeFilterGroups } from '../hooks/use_query_and_filters';

const BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.fieldStatusFilterGroupButtonLabel',
  {
    defaultMessage: 'Status',
  }
);

export const FieldStatusFilterGroup = ({
  onChangeFilterGroup,
}: {
  onChangeFilterGroup: ChangeFilterGroups;
}) => {
  const [items, setItems] = useState<Array<{ label: string; key?: string }>>(() =>
    Object.entries(FIELD_STATUS_MAP).map(([key, value]) => {
      return {
        label: value.label,
        key,
      };
    })
  );

  const onChangeItems = useCallback<Required<EuiSelectableProps>['onChange']>(
    (nextItems) => {
      setItems(nextItems);
      onChangeFilterGroup({
        status: nextItems
          .filter((nextItem) => nextItem.checked === 'on')
          .map((item) => item.key as string),
      });
    },
    [onChangeFilterGroup]
  );

  return (
    <FilterGroup items={items} filterGroupButtonLabel={BUTTON_LABEL} onChange={onChangeItems} />
  );
};
