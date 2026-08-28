/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DocumentToolsFlyoutHeader } from '../../../shared/components/document_tools_flyout_header';
import { ResponseDetailsContent } from './components/response_details';
import { RESPONSE_TITLE } from '../../../shared/constants/flyout_titles';

export interface ResponseDetailsProps {
  /**
   * Alert document used to fetch and display response actions.
   */
  hit: DataTableRecord;
}

/**
 * Response details tools flyout.
 */
export const ResponseDetails = memo(({ hit }: ResponseDetailsProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          padding-block: ${euiTheme.size.s} !important;
        `}
      >
        <DocumentToolsFlyoutHeader title={RESPONSE_TITLE} hit={hit} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ResponseDetailsContent hit={hit} />
      </EuiFlyoutBody>
    </>
  );
});

ResponseDetails.displayName = 'ResponseDetails';
