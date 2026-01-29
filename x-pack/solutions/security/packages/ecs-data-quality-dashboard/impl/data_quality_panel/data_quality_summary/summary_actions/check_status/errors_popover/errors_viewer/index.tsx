/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';

import {
  ERRORS_CONTAINER_MAX_WIDTH,
  ERRORS_CONTAINER_MIN_WIDTH,
  getErrorsViewerTableColumns,
} from './helpers';
import type { ErrorSummary } from '../../../../../types';

const styles = {
  errorsViewerContainer: css({
    maxWidth: ERRORS_CONTAINER_MAX_WIDTH,
    minWidth: ERRORS_CONTAINER_MIN_WIDTH,
  }),
};

interface Props {
  errorSummary: ErrorSummary[];
}

const ErrorsViewerComponent: React.FC<Props> = ({ errorSummary }) => {
  const columns = useMemo(() => getErrorsViewerTableColumns(), []);

  return (
    <div css={styles.errorsViewerContainer} data-test-subj="errorsViewer">
      <EuiInMemoryTable
        columns={columns}
        compressed={true}
        items={errorSummary}
        sorting={false}
        pagination={true}
        tableCaption={i18n.translate(
          'securitySolutionPackages.errorsViewerComponent.tableCaption',
          {
            defaultMessage: 'Errors viewer',
          }
        )}
      />
    </div>
  );
};

ErrorsViewerComponent.displayName = 'ErrorsViewerComponent';

export const ErrorsViewer = React.memo(ErrorsViewerComponent);
