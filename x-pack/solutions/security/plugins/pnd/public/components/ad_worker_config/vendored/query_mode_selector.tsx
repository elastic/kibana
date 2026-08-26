/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POC SPIKE — vendored from the Security Solution Attack Discovery flyout
 * (`.../workflow_configuration/query_mode_selector`). The ES|QL ↔ Query-builder mode toggle.
 * In the real Option A this lives in the shared package.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

export type QueryMode = 'custom_query' | 'esql';

export interface QueryModeSelectorProps {
  mode: QueryMode;
  onModeChange: (mode: QueryMode) => void;
}

const QUERY_MODE_LABEL = i18n.translate('xpack.pnd.adWorkerConfig.retrieval.queryModeLabel', {
  defaultMessage: 'Query mode',
});
const ESQL_MODE = i18n.translate('xpack.pnd.adWorkerConfig.retrieval.esqlMode', {
  defaultMessage: 'ES|QL mode',
});
const QUERY_BUILDER_MODE = i18n.translate('xpack.pnd.adWorkerConfig.retrieval.queryBuilderMode', {
  defaultMessage: 'Query builder mode',
});

const QUERY_MODE_OPTIONS: EuiButtonGroupOptionProps[] = [
  { id: 'esql', label: ESQL_MODE, 'data-test-subj': 'queryModeEsqlModeButton' },
  {
    id: 'custom_query',
    label: QUERY_BUILDER_MODE,
    'data-test-subj': 'queryModeQueryBuilderModeButton',
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
        legend={QUERY_MODE_LABEL}
        onChange={handleModeChange}
        options={options}
        type="single"
      />
    </EuiFormRow>
  );
};

QueryModeSelectorComponent.displayName = 'QueryModeSelector';

export const QueryModeSelector = React.memo(QueryModeSelectorComponent);
