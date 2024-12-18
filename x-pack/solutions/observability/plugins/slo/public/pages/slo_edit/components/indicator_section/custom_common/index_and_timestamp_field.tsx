/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { CreateSLOForm } from '../../../types';
import { TimestampFieldSelector } from '../../common/timestamp_field_selector';
import { IndexSelection } from './index_selection';

interface Props {
  dataView?: DataView;
  isLoading: boolean;
}

export function IndexAndTimestampField({ dataView, isLoading }: Props) {
  const { watch } = useFormContext<CreateSLOForm>();
  const index = watch('indicator.params.index');

  const timestampFields = dataView?.fields?.filter((field) => field.type === 'date') ?? [];

  return (
    <EuiFlexGroup gutterSize="m" css={{ paddingRight: 34 }}>
      <EuiFlexItem grow={5}>
        <IndexSelection selectedDataView={dataView} />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <TimestampFieldSelector
          fields={timestampFields}
          isLoading={!!index && isLoading}
          isDisabled={!index}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
