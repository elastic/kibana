/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { VulnerabilityGroupingMultiValueOptions } from '../../common/types';
import { PopoverTableItems } from './popover_table_items';

interface FindingsMultiValueCellRenderProps<T> {
  finding: T;
  multiValueField: VulnerabilityGroupingMultiValueOptions;
  renderItem: (item: string, i: number, field: string, finding: T) => React.ReactNode;
}

const FindingsMultiValueCellRenderComponent = <T extends Record<string, any>>({
  finding,
  multiValueField,
  renderItem,
}: FindingsMultiValueCellRenderProps<T>) => {
  const value = get(multiValueField, finding);
  if (!Array.isArray(value)) {
    return <>{value || '-'}</>;
  }

  return (
    <EuiFlexGroup wrap={false} responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>{value[0]}</EuiFlexItem>
      {value.length > 1 && (
        <EuiFlexItem grow={false}>
          <PopoverTableItems
            items={value}
            renderItem={(item, index) => renderItem(item, index, multiValueField, finding)}
            field={multiValueField}
            finding={finding}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const MemoizedFindingsMultiValueCellRenderComponent = React.memo(
  FindingsMultiValueCellRenderComponent
);
MemoizedFindingsMultiValueCellRenderComponent.displayName = 'FindingsMultiValueCellRenderComponent';

export const FindingsMultiValueCellRender =
  MemoizedFindingsMultiValueCellRenderComponent as typeof FindingsMultiValueCellRenderComponent;
