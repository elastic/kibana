/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import { NotebookDefinition } from '../types';

import { NotebookCell } from './notebook_cell';
import { NotebookCellOutput } from './notebook_cell_output';

export interface NotebookRendererProps {
  notebook: NotebookDefinition;
}

export const NotebookRenderer = ({ notebook }: NotebookRendererProps) => {
  const { euiTheme } = useEuiTheme();
  const language = notebook.metadata?.language_info?.name ?? 'python';
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xl"
      style={{ maxWidth: `${euiTheme.base * 50}px` }}
      justifyContent="center"
    >
      {notebook.cells.map((cell, i) => {
        const cellId = cell.id ?? `nb.cell.${i}`;
        if (cell.outputs && cell.outputs.length > 0) {
          return (
            <EuiFlexItem key={cellId}>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <NotebookCell cell={cell} language={language} />
                </EuiFlexItem>
                {cell.outputs.map((output, outputIndex) => (
                  <EuiFlexItem key={`${cellId}.output.${outputIndex}`}>
                    <NotebookCellOutput output={output} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        }
        return (
          <EuiFlexItem key={cellId}>
            <NotebookCell cell={cell} language={language} />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
