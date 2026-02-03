/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import type { CreateSLOForm } from '../../../types';
import { TimestampFieldSelector } from '../../common/timestamp_field_selector';
import { IndexSelection } from './index_selection';

interface Props {
  dataView?: DataView;
  isLoading: boolean;
  isFlyout?: boolean;
}

export function IndexAndTimestampField({ dataView, isLoading, isFlyout = false }: Props) {
  const { watch } = useFormContext<CreateSLOForm>();
  const index = watch('indicator.params.index');

  const timestampFields = dataView?.fields?.filter((field) => field.type === 'date') ?? [];

  return (
    <EuiFlexGroup
      direction={isFlyout ? 'column' : 'row'}
      gutterSize="m"
      css={isFlyout ? undefined : { paddingRight: 34 }}
    >
      {/* minWidth is used to prevent the flex items from growing too wide */}
      <EuiFlexItem grow={isFlyout ? true : 5} css={{ minWidth: 0 }}>
        <IndexSelection selectedDataView={dataView} />
      </EuiFlexItem>
      <EuiFlexItem grow={isFlyout ? true : 2} css={{ minWidth: 0 }}>
        <TimestampFieldSelector
          fields={timestampFields}
          isLoading={!!index && isLoading}
          isDisabled={!index}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
