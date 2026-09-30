/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPagination } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFlyoutPagination } from '../../pagination/use_flyout_pagination';
import { FLYOUT_V2_DOCUMENT_PAGINATION_TEST_ID } from './test_ids';

const PAGINATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.flyoutV2.document.header.paginationAriaLabel',
  {
    defaultMessage: 'Navigate between documents',
  }
);

/**
 * Whether the current pagination slice has more than one document to step through.
 * Absent when the flyout was opened without a `PaginationStoreProvider`.
 */
export const useShowDocumentPagination = (): boolean => {
  const { totalDocumentCount, flyoutDocumentIndex } = useFlyoutPagination();
  return totalDocumentCount > 1 && flyoutDocumentIndex != null && flyoutDocumentIndex >= 0;
};

/**
 * Compressed pager for the document flyout. Reads the current index from the
 * pagination store, so it stays correct while the document body is still loading.
 */
export const DocumentPagination = memo(() => {
  const { flyoutDocumentIndex, totalDocumentCount, openDocumentFlyout } = useFlyoutPagination();
  const showPagination = useShowDocumentPagination();

  if (!showPagination || flyoutDocumentIndex == null) {
    return null;
  }

  return (
    <EuiPagination
      aria-label={PAGINATION_ARIA_LABEL}
      pageCount={totalDocumentCount}
      activePage={flyoutDocumentIndex}
      onPageClick={openDocumentFlyout}
      compressed
      data-test-subj={FLYOUT_V2_DOCUMENT_PAGINATION_TEST_ID}
    />
  );
});

DocumentPagination.displayName = 'DocumentPagination';
