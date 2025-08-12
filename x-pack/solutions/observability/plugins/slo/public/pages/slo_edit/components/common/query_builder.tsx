/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import React, { ReactNode } from 'react';
import { FieldPath } from 'react-hook-form';
import { CreateSLOForm } from '../../types';
import { QueryDocumentsFlyoutOpenButton } from './query_documents_flyout_open_button';
import { QuerySearchBar } from './query_search_bar';
import { RunTimeFieldUsed } from './runtime_field_used';

export interface SearchBarProps {
  dataTestSubj: string;
  dataView?: DataView;
  label: string;
  name: FieldPath<CreateSLOForm>;
  placeholder: string;
  required?: boolean;
  tooltip?: ReactNode;
}

export function QueryBuilder(props: SearchBarProps) {
  const { dataView, name } = props;

  return (
    <>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <QuerySearchBar {...props} />
        </EuiFlexItem>
        <QueryDocumentsFlyoutOpenButton name={name} dataView={dataView} searchBarProps={props} />
      </EuiFlexGroup>
      <RunTimeFieldUsed dataView={dataView} name={name} />
    </>
  );
}
