/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';

import * as i18n from '../translations';

export type QueryMode = 'custom_query' | 'esql';

export interface QueryModeSelectorProps {
  mode: QueryMode;
  onModeChange: (mode: QueryMode) => void;
}

const QUERY_MODE_OPTIONS: EuiButtonGroupOptionProps[] = [
  {
    id: 'custom_query',
    label: i18n.QUERY_BUILDER_MODE,
    'data-test-subj': 'queryModeQueryBuilderModeButton',
  },
  {
    id: 'esql',
    label: i18n.ESQL_MODE,
    'data-test-subj': 'queryModeEsqlModeButton',
  },
];

const QueryModeSelectorComponent: React.FC<QueryModeSelectorProps> = ({ mode, onModeChange }) => {
  const options = useMemo(() => QUERY_MODE_OPTIONS, []);

  const handleModeChange = useCallback(
    (id: string) => {
      if (id === 'custom_query' || id === 'esql') {
        onModeChange(id);
      }
    },
    [onModeChange]
  );

  return (
    <EuiFormRow
      css={css`
        max-width: 575px;

        .euiButtonGroup__buttons {
          overflow: hidden;
        }

        .euiButtonGroupButton {
          block-size: 100%;
          margin: 0;
        }
      `}
      data-test-subj="queryModeSelector"
    >
      <EuiButtonGroup
        buttonSize="compressed"
        color="primary"
        idSelected={mode}
        isFullWidth
        legend={i18n.QUERY_MODE_LABEL}
        onChange={handleModeChange}
        options={options}
        type="single"
      />
    </EuiFormRow>
  );
};

QueryModeSelectorComponent.displayName = 'QueryModeSelector';

export const QueryModeSelector = React.memo(QueryModeSelectorComponent);
QueryModeSelector.displayName = 'QueryModeSelector';
