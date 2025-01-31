/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  PropsWithChildren,
  Reducer,
  useCallback,
  useContext,
  useReducer,
  useState,
} from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPortal,
  EuiProgress,
  EuiSearchBar,
  Query,
} from '@elastic/eui';
import { FieldDefinitionConfig } from '@kbn/streams-schema';
import { FieldStatusFilterGroup } from './filters/status_filter_group';
import { FieldTypeFilterGroup } from './filters/type_filter_group';

type SchemaFieldStatus = 'inherited' | 'mapped' | 'unmapped';

export interface SchemaField extends FieldDefinitionConfig {
  name: string;
  parent: string;
  status: SchemaFieldStatus;
}

export interface SchemaEditorProps {
  fields: SchemaField[];
  isLoading?: boolean;
}

const SchemaEditorContext = React.createContext<SchemaEditorProps | undefined>(undefined);

export function SchemaEditor({
  fields,
  isLoading,
  children,
}: PropsWithChildren<SchemaEditorProps>) {
  return (
    <SchemaEditorContext.Provider value={{ fields }}>
      <EuiFlexGroup direction="column" gutterSize="m">
        {isLoading ? (
          <EuiPortal>
            <EuiProgress size="xs" color="accent" position="fixed" />
          </EuiPortal>
        ) : null}
        {children}
      </EuiFlexGroup>
    </SchemaEditorContext.Provider>
  );
}

SchemaEditor.Controls = Controls;

function Controls() {
  const { fields } = useContext(SchemaEditorContext);

  const { controls, updateControls } = useControls({ onChange: setControls });

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiSearchBar
            query={controls.query}
            onChange={(nextQuery) => updateControls({ query: nextQuery.query ?? undefined })}
            box={{
              incremental: true,
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldTypeFilterGroup onChangeFilterGroup={updateControls} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldStatusFilterGroup onChangeFilterGroup={updateControls} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

const defaultControls = {
  query: EuiSearchBar.Query.MATCH_ALL,
  status: [] as SchemaFieldStatus[],
  type: [] as Array<SchemaField['type']>,
} as const;

type Controls = typeof defaultControls;

export const useControls = ({ onChange }: { onChange: (controls: Controls) => void }) => {
  const [controls, updateControls] = useReducer<Reducer<Controls, Partial<Controls>>>(
    (prev, updated) => {
      const nextControls = { ...prev, ...updated };

      if (onChange) {
        onChange(nextControls);
      }

      return nextControls;
    },
    defaultControls
  );

  return {
    controls,
    updateControls,
  };
};
