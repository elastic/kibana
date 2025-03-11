/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import {
  Criteria,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiSpacer,
} from '@elastic/eui';
import { WelcomeMessageKnowledgeBase } from '@kbn/ai-assistant/src/chat/welcome_message_knowledge_base';
import { css } from '@emotion/css';
import { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/public';
import { useKnowledgeBase } from '@kbn/ai-assistant/src/hooks';
import { AssistantBeacon } from '@kbn/ai-assistant-icon';
import { useGetKnowledgeBaseEntries } from '../../hooks/use_get_knowledge_base_entries';
import { categorizeEntries, KnowledgeBaseEntryCategory } from '../../helpers/categorize_entries';
import { KnowledgeBaseEditManualEntryFlyout } from './knowledge_base_edit_manual_entry_flyout';
import { KnowledgeBaseCategoryFlyout } from './knowledge_base_category_flyout';
import { KnowledgeBaseBulkImportFlyout } from './knowledge_base_bulk_import_flyout';
import { useKibana } from '../../hooks/use_kibana';
import { KnowledgeBaseEditUserInstructionFlyout } from './knowledge_base_edit_user_instruction_flyout';

const fullHeightClassName = css`
  height: 100%;
`;

const centerMaxWidthClassName = css`
  text-align: center;
`;

export function KnowledgeBaseTab() {
  const { uiSettings } = useKibana().services;
  const dateFormat = uiSettings.get('dateFormat');

  const knowledgeBase = useKnowledgeBase();

  const columns: Array<EuiBasicTableColumn<KnowledgeBaseEntryCategory>> = [
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.observabilityAiAssistantManagement.span.expandRowLabel', {
              defaultMessage: 'Expand row',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      render: (category: KnowledgeBaseEntryCategory) => {
        return (
          <EuiButtonIcon
            data-test-subj="pluginsColumnsButton"
            onClick={() => setSelectedCategory(category)}
            aria-label={
              category.categoryKey === selectedCategory?.categoryKey ? 'Collapse' : 'Expand'
            }
            iconType={
              category.categoryKey === selectedCategory?.categoryKey ? 'minimize' : 'expand'
            }
          />
        );
      },
    },
    {
      field: '',
      name: '',
      render: (category: KnowledgeBaseEntryCategory) => {
        if (category.entries.length === 1 && category.entries[0].role === 'user_entry') {
          return <EuiIcon type="documentation" color="primary" />;
        }
        if (
          category.entries.length === 1 &&
          category.entries[0].role === 'assistant_summarization'
        ) {
          return <EuiIcon type="sparkles" color="primary" />;
        }

        return <EuiIcon type="logoElastic" />;
      },
      width: '40px',
    },
    {
      'data-test-subj': 'knowledgeBaseTableTitleCell',
      field: 'title',
      name: i18n.translate('xpack.observabilityAiAssistantManagement.kbTab.columns.name', {
        defaultMessage: 'Name',
      }),
      sortable: true,
    },
    {
      name: i18n.translate(
        'xpack.observabilityAiAssistantManagement.kbTab.columns.numberOfEntries',
        {
          defaultMessage: 'Number of entries',
        }
      ),
      width: '140px',
      render: (category: KnowledgeBaseEntryCategory) => {
        if (category.entries.length > 1 && category.entries[0].role === 'elastic') {
          return <EuiBadge>{category.entries.length}</EuiBadge>;
        }
        return null;
      },
    },
    {
      'data-test-subj': 'knowledgeBaseTableAuthorCell',
      name: i18n.translate('xpack.observabilityAiAssistantManagement.kbTab.columns.author', {
        defaultMessage: 'Author',
      }),
      width: '140px',
      render: (category: KnowledgeBaseEntryCategory) => {
        return category.entries[0]?.user?.name;
      },
    },
    {
      field: '@timestamp',
      name: i18n.translate('xpack.observabilityAiAssistantManagement.kbTab.columns.dateCreated', {
        defaultMessage: 'Date created',
      }),
      width: '140px',
      sortable: true,
      render: (timestamp: KnowledgeBaseEntry['@timestamp']) => (
        <EuiBadge color="hollow">{moment(timestamp).format(dateFormat)}</EuiBadge>
      ),
    },
    {
      name: i18n.translate('xpack.observabilityAiAssistantManagement.kbTab.columns.type', {
        defaultMessage: 'Type',
      }),
      width: '140px',
      render: (category: KnowledgeBaseEntryCategory) => {
        if (category.entries.length === 1 && category.entries[0].role === 'user_entry') {
          return (
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.kbTab.columns.manualBadgeLabel',
                {
                  defaultMessage: 'Manual',
                }
              )}
            </EuiBadge>
          );
        }

        if (
          category.entries.length === 1 &&
          category.entries[0].role === 'assistant_summarization'
        ) {
          return (
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.kbTab.columns.assistantSummarization',
                {
                  defaultMessage: 'Assistant',
                }
              )}
            </EuiBadge>
          );
        }

        return (
          <EuiBadge>
            {i18n.translate('xpack.observabilityAiAssistantManagement.columns.systemBadgeLabel', {
              defaultMessage: 'System',
            })}
          </EuiBadge>
        );
      },
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState<
    KnowledgeBaseEntryCategory | undefined
  >();

  const [newEntryFlyoutType, setNewEntryFlyoutType] = useState<
    'singleEntry' | 'bulkImport' | undefined
  >();

  const [isNewEntryPopoverOpen, setIsNewEntryPopoverOpen] = useState(false);
  const [isEditUserInstructionFlyoutOpen, setIsEditUserInstructionFlyoutOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<keyof KnowledgeBaseEntryCategory>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const {
    entries = [],
    isLoading,
    refetch,
  } = useGetKnowledgeBaseEntries({ query, sortBy, sortDirection });
  const categorizedEntries = categorizeEntries({ entries });

  const handleChangeSort = ({ sort }: Criteria<KnowledgeBaseEntryCategory>) => {
    if (sort) {
      const { field, direction } = sort;
      setSortBy(field);
      setSortDirection(direction);
    }
  };

  const handleChangeQuery = (e: React.ChangeEvent<HTMLInputElement> | undefined) => {
    setQuery(e?.currentTarget.value || '');
  };

  return knowledgeBase.status.value?.ready ? (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow>
              <EuiFieldSearch
                data-test-subj="knowledgeBaseTabFieldSearch"
                fullWidth
                placeholder={i18n.translate(
                  'xpack.observabilityAiAssistantManagement.knowledgeBaseTab.euiFieldSearch.searchThisLabel',
                  { defaultMessage: 'Search for an entry' }
                )}
                value={query}
                onChange={handleChangeQuery}
                isClearable
                aria-label={i18n.translate(
                  'xpack.observabilityAiAssistantManagement.knowledgeBaseTab.euiFieldSearch.searchEntriesLabel',
                  { defaultMessage: 'Search entries' }
                )}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="knowledgeBaseTabReloadButton"
                color="success"
                iconType="refresh"
                onClick={() => refetch()}
              >
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.knowledgeBaseTab.reloadButtonLabel',
                  { defaultMessage: 'Reload' }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilityAiAssistantManagementKnowledgeBaseTabEditInstructionsButton"
                color="text"
                onClick={() => setIsEditUserInstructionFlyoutOpen(true)}
              >
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.knowledgeBaseTab.editInstructionsButtonLabel',
                  { defaultMessage: 'Edit User-specific Prompt' }
                )}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={isNewEntryPopoverOpen}
                closePopover={() => setIsNewEntryPopoverOpen(false)}
                button={
                  <EuiButton
                    fill
                    data-test-subj="knowledgeBaseNewEntryButton"
                    iconSide="right"
                    iconType="arrowDown"
                    onClick={() => setIsNewEntryPopoverOpen((prevValue) => !prevValue)}
                  >
                    {i18n.translate(
                      'xpack.observabilityAiAssistantManagement.knowledgeBaseTab.newEntryButtonLabel',
                      {
                        defaultMessage: 'New entry',
                      }
                    )}
                  </EuiButton>
                }
              >
                <EuiContextMenuPanel
                  size="s"
                  items={[
                    <EuiContextMenuItem
                      key="singleEntry"
                      icon="document"
                      data-test-subj="knowledgeBaseSingleEntryContextMenuItem"
                      onClick={() => {
                        setIsNewEntryPopoverOpen(false);
                        setNewEntryFlyoutType('singleEntry');
                      }}
                      size="s"
                    >
                      {i18n.translate(
                        'xpack.observabilityAiAssistantManagement.knowledgeBaseTab.singleEntryContextMenuItemLabel',
                        { defaultMessage: 'Single entry' }
                      )}
                    </EuiContextMenuItem>,
                    <EuiContextMenuItem
                      key="bulkImport"
                      icon="documents"
                      data-test-subj="knowledgeBaseBulkImportContextMenuItem"
                      onClick={() => {
                        setIsNewEntryPopoverOpen(false);
                        setNewEntryFlyoutType('bulkImport');
                      }}
                    >
                      {i18n.translate(
                        'xpack.observabilityAiAssistantManagement.knowledgeBaseTab.bulkImportContextMenuItemLabel',
                        { defaultMessage: 'Bulk import' }
                      )}
                    </EuiContextMenuItem>,
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiBasicTable<KnowledgeBaseEntryCategory>
            data-test-subj="knowledgeBaseTable"
            columns={columns}
            items={categorizedEntries}
            loading={isLoading}
            sorting={{
              sort: {
                field: sortBy,
                direction: sortDirection,
              },
            }}
            rowProps={(row) => ({
              onClick: () => setSelectedCategory(row),
            })}
            onChange={handleChangeSort}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isEditUserInstructionFlyoutOpen ? (
        <KnowledgeBaseEditUserInstructionFlyout
          onClose={() => setIsEditUserInstructionFlyoutOpen(false)}
        />
      ) : null}

      {newEntryFlyoutType === 'singleEntry' ? (
        <KnowledgeBaseEditManualEntryFlyout onClose={() => setNewEntryFlyoutType(undefined)} />
      ) : null}

      {newEntryFlyoutType === 'bulkImport' ? (
        <KnowledgeBaseBulkImportFlyout onClose={() => setNewEntryFlyoutType(undefined)} />
      ) : null}

      {selectedCategory ? (
        selectedCategory.entries.length === 1 &&
        (selectedCategory.entries[0].role === 'user_entry' ||
          selectedCategory.entries[0].role === 'assistant_summarization') ? (
          <KnowledgeBaseEditManualEntryFlyout
            entry={selectedCategory.entries[0]}
            onClose={() => {
              setSelectedCategory(undefined);
              refetch();
            }}
          />
        ) : (
          <KnowledgeBaseCategoryFlyout
            category={selectedCategory}
            onClose={() => setSelectedCategory(undefined)}
          />
        )
      ) : null}
    </>
  ) : (
    <EuiFlexGroup
      alignItems="center"
      direction="column"
      gutterSize="none"
      className={fullHeightClassName}
    >
      <EuiFlexItem grow={false}>
        <AssistantBeacon backgroundColor="emptyShade" size="xl" />
      </EuiFlexItem>
      <EuiSpacer size="l" />

      <EuiFlexItem grow className={centerMaxWidthClassName}>
        <WelcomeMessageKnowledgeBase knowledgeBase={knowledgeBase} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
