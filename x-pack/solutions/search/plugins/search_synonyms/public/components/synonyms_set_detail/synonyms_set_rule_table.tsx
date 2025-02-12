/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiTextTruncate,
} from '@elastic/eui';
import { SynonymsSynonymRule } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { DEFAULT_PAGE_VALUE, paginationToPage } from '../../../common/pagination';
import { useFetchSynonymsSet } from '../../hooks/use_fetch_synonyms_set';
import { getExplicitSynonym, isExplicitSynonym } from '../../utils/synonyms_utils';
import { DeleteSynonymRuleModal } from './delete_synonym_rule_modal';
import { SynonymsSetEmptyRuleTable } from './empty_rules_table';
import { SynonymsSetEmptyRulesCards } from './empty_rules_cards';
import { SynonymsRuleFlyout } from './synonyms_set_rule_flyout';
import { useFetchSynonymRule } from '../../hooks/use_fetch_synonym_rule';
import { useFetchGeneratedRuleId } from '../../hooks/use_fetch_generated_rule_id';

export const SynonymsSetRuleTable = ({ synonymsSetId = '' }: { synonymsSetId: string }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_VALUE.size);
  const { from } = paginationToPage({ pageIndex, pageSize, totalItemCount: 0 });
  const [synonymRuleToDelete, setSynonymRuleToDelete] = useState<string | null>(null);
  const { data, isLoading, isInitialLoading } = useFetchSynonymsSet(synonymsSetId, {
    from,
    size: pageSize,
  });
  const [addNewRulePopoverOpen, setAddNewRulePopoverOpen] = useState(false);

  const [isRuleFlyoutOpen, setIsRuleFlyoutOpen] = useState(false);
  const [synonymsRuleToEdit, setSynonymsRuleToEdit] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const { data: synonymsRule } = useFetchSynonymRule(synonymsSetId, synonymsRuleToEdit || '');
  const [ruleTypeToCreate, setRuleTypeToCreate] = useState<'equivalent' | 'explicit' | null>(null);

  const { mutate: generateRuleId } = useFetchGeneratedRuleId((ruleId) => {
    if (synonymsSetId && ruleTypeToCreate) {
      setGeneratedId(ruleId);
      setIsRuleFlyoutOpen(true);
      setAddNewRulePopoverOpen(false);
    }
  });

  if (!data) return null;

  const pagination = {
    initialPageSize: 25,
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
      render: (synonyms: string, synonymRule: SynonymsSynonymRule) => {
        const isExplicit = isExplicitSynonym(synonyms);
        const [explicitFrom = '', explicitTo = ''] = isExplicit ? getExplicitSynonym(synonyms) : [];

        return (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="searchSynonymsColumnsButton"
                iconType="expand"
                aria-label={i18n.translate(
                  'xpack.searchSynonyms.synonymsSetTable.expandSynonyms.aria.label',
                  {
                    defaultMessage: 'Expand synonyms rule',
                  }
                )}
                onClick={() => {
                  if (synonymRule.id) {
                    setSynonymsRuleToEdit(synonymRule.id);
                    setIsRuleFlyoutOpen(true);
                  }
                }}
              />
            </EuiFlexItem>
            {isExplicit ? (
              <>
                <EuiFlexItem data-test-subj="synonyms-set-item-explicit-from" grow={7}>
                  <EuiCode>
                    <EuiTextTruncate text={explicitFrom} />
                  </EuiCode>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <b>{'=>'}</b>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={1} data-test-subj="synonyms-set-item-explicit-to">
                  <EuiCode>
                    <EuiTextTruncate text={explicitTo} />
                  </EuiCode>
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
          onClick: (synonymRule: SynonymsSynonymRule) => {
            if (synonymRule.id) {
              setSynonymsRuleToEdit(synonymRule.id);
              setIsRuleFlyoutOpen(true);
            }
          },
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
      {data.data.length === 0 && !isInitialLoading && (
        <SynonymsSetEmptyRuleTable
          onCreateRule={(type: 'equivalent' | 'explicit') => {
            setRuleTypeToCreate(type);
            generateRuleId({ synonymsSetId });
          }}
        />
      )}

      {isRuleFlyoutOpen && generatedId ? (
        <SynonymsRuleFlyout
          synonymsSetId={synonymsSetId}
          onClose={() => {
            setIsRuleFlyoutOpen(false);
            setSynonymsRuleToEdit(null);
            setGeneratedId(null);
            setRuleTypeToCreate(null);
          }}
          flyoutMode={'create'}
          synonymsRule={{ id: generatedId, synonyms: '' }}
          renderExplicit={ruleTypeToCreate === 'explicit'}
        />
      ) : (
        synonymsRule && (
          <SynonymsRuleFlyout
            synonymsSetId={synonymsSetId}
            onClose={() => {
              setIsRuleFlyoutOpen(false);
              setSynonymsRuleToEdit(null);
              setGeneratedId(null);
              setRuleTypeToCreate(null);
            }}
            flyoutMode={'edit'}
            synonymsRule={synonymsRule}
          />
        )
      )}
      {data.data.length !== 0 && (
        <>
          <EuiPopover
            button={
              <EuiButton
                data-test-subj="searchSynonymsSynonymsSetRuleTableAddRuleButton"
                iconType="plusInCircle"
                onClick={() => {
                  setAddNewRulePopoverOpen(true);
                }}
              >
                {i18n.translate('xpack.searchSynonyms.synonymsSetTable.addRuleButton', {
                  defaultMessage: 'Add rule',
                })}
              </EuiButton>
            }
            isOpen={addNewRulePopoverOpen}
            closePopover={() => setAddNewRulePopoverOpen(false)}
          >
            <EuiPopoverTitle>
              {i18n.translate('xpack.searchSynonyms.synonymsSetTable.addRule.title', {
                defaultMessage: 'Select a rule type',
              })}
            </EuiPopoverTitle>
            <SynonymsSetEmptyRulesCards
              onCreateRule={(type: 'equivalent' | 'explicit') => {
                setRuleTypeToCreate(type);
                generateRuleId({ synonymsSetId });
              }}
            />
          </EuiPopover>

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
      )}
    </>
  );
};
