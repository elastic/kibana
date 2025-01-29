/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { SynonymsSynonymRule } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { DEFAULT_PAGE_VALUE, paginationToPage } from '../../../common/pagination';
import { useFetchSynonymsSet } from '../../hooks/use_fetch_synonyms_set';
import { getExplicitSynonym, isExplicitSynonym } from '../../utils/synonyms_utils';
import { DeleteSynonymRuleModal } from './delete_synonym_rule_modal';

export const SynonymsSetRuleTable = ({ synonymsSetId = '' }: { synonymsSetId: string }) => {
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_VALUE.size);
  const { from } = paginationToPage({ pageIndex, pageSize, totalItemCount: 0 });
  const [synonymRuleToDelete, setSynonymRuleToDelete] = React.useState<string | null>(null);
  const { data, isLoading } = useFetchSynonymsSet(synonymsSetId, { from, size: pageSize });

  if (!data) return null;

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 25, 50],
    ...data._meta,
    pageSize,
    pageIndex,
  };

  const columns: Array<EuiBasicTableColumn<SynonymsSynonymRule>> = [
    {
      field: 'synonyms',
      name: i18n.translate('xpack.searchSynonyms.synonymsSetTable.synonymsColumn', {
        defaultMessage: 'Synonyms',
      }),
      render: (synonyms: string) => {
        const isExplicit = isExplicitSynonym(synonyms);
        const [explicitFrom = '', explicitTo = ''] = isExplicit ? getExplicitSynonym(synonyms) : [];

        return (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="expand"
                aria-label={i18n.translate(
                  'xpack.searchSynonyms.synonymsSetTable.expandSynonyms.aria.label',
                  {
                    defaultMessage: 'Expand synonyms rule',
                  }
                )}
              />
            </EuiFlexItem>
            {isExplicit ? (
              <>
                <EuiFlexItem data-test-subj="synonyms-set-item-explicit-from">
                  <EuiCode>{explicitFrom}</EuiCode>
                </EuiFlexItem>
                <EuiText>
                  <b>{'=>'}</b>
                </EuiText>
                <EuiFlexItem grow={false} data-test-subj="synonyms-set-item-explicit-to">
                  <EuiCode>{explicitTo}</EuiCode>
                </EuiFlexItem>
              </>
            ) : (
              <EuiFlexItem data-test-subj="synonyms-set-item-equivalent">
                <EuiCode>{synonyms}</EuiCode>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      width: '8%',
      actions: [
        {
          name: i18n.translate('xpack.searchSynonyms.synonymsSetTable.actions.delete', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate(
            'xpack.searchSynonyms.synonymsSetTable.actions.deleteDescription',
            {
              defaultMessage: 'Delete synonym rule',
            }
          ),
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: (synonymRule: SynonymsSynonymRule) => {
            if (synonymRule.id) {
              setSynonymRuleToDelete(synonymRule.id);
            }
          },
        },
        {
          name: i18n.translate('xpack.searchSynonyms.synonymsSetTable.actions.edit', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate(
            'xpack.searchSynonyms.synonymsSetTable.actions.editDescription',
            {
              defaultMessage: 'Edit synonym rule',
            }
          ),
          icon: 'pencil',
          type: 'icon',
          onClick: () => {},
        },
      ],
    },
  ];

  return (
    <>
      {synonymRuleToDelete && (
        <DeleteSynonymRuleModal
          synonymsSetId={synonymsSetId}
          ruleId={synonymRuleToDelete}
          closeDeleteModal={() => setSynonymRuleToDelete(null)}
        />
      )}
      <EuiBasicTable
        data-test-subj="synonyms-set-table"
        items={data.data}
        columns={columns}
        loading={isLoading}
        pagination={pagination}
        onChange={({ page }) => {
          setPageIndex(page.index);
          setPageSize(page.size);
        }}
      />
    </>
  );
};
