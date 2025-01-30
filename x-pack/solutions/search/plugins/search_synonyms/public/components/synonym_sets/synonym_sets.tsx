/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { SynonymsGetSynonymsSetsSynonymsSetItem } from '@elastic/elasticsearch/lib/api/types';
import { EuiBasicTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { PLUGIN_ROUTE_ROOT } from '../../../common/api_routes';
import { DEFAULT_PAGE_VALUE, paginationToPage } from '../../../common/pagination';
import { useFetchSynonymsSets } from '../../hooks/use_fetch_synonyms_sets';
import { DeleteSynonymsSetModal } from './delete_synonyms_set_modal';

export const SynonymSets = () => {
  const {
    services: { application, http },
  } = useKibana();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_VALUE.size);
  const { from } = paginationToPage({ pageIndex, pageSize, totalItemCount: 0 });
  const { data: synonyms } = useFetchSynonymsSets({ from, size: pageSize });
  const [synonymsSetToDelete, setSynonymsSetToDelete] = useState<string | null>(null);

  if (!synonyms) {
    return null;
  }

  const pagination = {
    initialPageSize: 25,
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
      render: (name: string) => (
        <div data-test-subj="synonyms-set-item-name">
          <EuiLink
            data-test-subj="searchSynonymsColumnsLink"
            onClick={() =>
              application.navigateToUrl(http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/sets/${name}`))
            }
          >
            {name}
          </EuiLink>
        </div>
      ),
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
    {
      actions: [
        {
          name: i18n.translate('xpack.searchSynonyms.synonymsSetTable.actions.delete', {
            defaultMessage: 'Delete',
          }),
          description: (synonymsSet: SynonymsGetSynonymsSetsSynonymsSetItem) =>
            i18n.translate('xpack.searchSynonyms.synonymsSetTable.actions.deleteDescription', {
              defaultMessage: 'Delete synonyms set with {name}',
              values: { name: synonymsSet.synonyms_set },
            }),
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: (synonymsSet: SynonymsGetSynonymsSetsSynonymsSetItem) => {
            setSynonymsSetToDelete(synonymsSet.synonyms_set);
          },
        },
        {
          name: i18n.translate('xpack.searchSynonyms.synonymsSetTable.actions.edit', {
            defaultMessage: 'Edit',
          }),
          description: (synonymsSet: SynonymsGetSynonymsSetsSynonymsSetItem) =>
            i18n.translate('xpack.searchSynonyms.synonymsSetTable.actions.editDescription', {
              defaultMessage: 'Edit synonyms set {name}',
              values: { name: synonymsSet.synonyms_set },
            }),
          icon: 'pencil',
          color: 'text',
          type: 'icon',
          onClick: (synonymsSet: SynonymsGetSynonymsSetsSynonymsSetItem) =>
            application.navigateToUrl(
              http.basePath.prepend(`${PLUGIN_ROUTE_ROOT}/sets/${synonymsSet.synonyms_set}`)
            ),
        },
      ],
    },
  ];
  return (
    <div>
      {synonymsSetToDelete && (
        <DeleteSynonymsSetModal
          synonymsSetId={synonymsSetToDelete}
          closeDeleteModal={() => setSynonymsSetToDelete(null)}
        />
      )}
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
