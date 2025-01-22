/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SynonymsGetSynonymsSetsSynonymsSetItem } from '@elastic/elasticsearch/lib/api/types';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { DEFAULT_PAGE_VALUE, paginationToPage } from '../../../common/pagination';
import { useFetchSynonymsSets } from '../../hooks/use_fetch_synonyms_sets';

export const SynonymSets = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_VALUE.size);
  const { from } = paginationToPage({ pageIndex, pageSize, totalItemCount: 0 });
  const { data: synonyms } = useFetchSynonymsSets({ from, size: pageSize });

  if (!synonyms) {
    return null;
  }

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 25, 50],
    ...synonyms._meta,
    pageSize,
    pageIndex,
  };
  const columns: Array<EuiBasicTableColumn<SynonymsGetSynonymsSetsSynonymsSetItem>> = [
    {
      field: 'synonyms_set',
      name: i18n.translate('xpack.searchSynonyms.synonymsSetTable.nameColumn', {
        defaultMessage: 'Synonyms Set',
      }),
      render: (name: string) => <div data-test-subj="synonyms-set-item-name">{name}</div>,
    },
    {
      field: 'count',
      name: i18n.translate('xpack.searchSynonyms.synonymsSetTable.ruleCount', {
        defaultMessage: 'Rule Count',
      }),
      render: (ruleCount: number) => (
        <div data-test-subj="synonyms-set-item-rule-count">{ruleCount}</div>
      ),
    },
  ];
  return (
    <div>
      <EuiBasicTable
        data-test-subj="synonyms-set-table"
        items={synonyms.data}
        columns={columns}
        pagination={pagination}
        onChange={({ page: changedPage }) => {
          setPageIndex(changedPage.index);
          setPageSize(changedPage.size);
        }}
      />
    </div>
  );
};
