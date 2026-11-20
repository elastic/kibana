/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { LibraryListPlaceholderRow, LibraryRuleRow, RuleLibraryListItem } from '../types';
import type { LibraryRulesState } from '../use_library_rules';
import * as i18n from '../translations';
import { LibraryHeader } from './library_header';
import { LibraryListsPlaceholder } from './library_lists_placeholder';
import { LibraryNotSynced } from './library_not_synced';
import { LibraryRulesTable } from './library_rules_table';
import { LibraryTabs } from './library_tabs';
import type { LibraryTab } from './library_tabs';

interface LibraryBodyProps {
  libraries: readonly RuleLibraryListItem[];
  selectedLibrary?: RuleLibraryListItem;
  selectedLibraryId: string;
  isAllSelected: boolean;
  rules: LibraryRulesState;
  exceptionLists: readonly LibraryListPlaceholderRow[];
  valueLists: readonly LibraryListPlaceholderRow[];
  activeTab: LibraryTab;
  canEdit: boolean;
  onSelectTab: (tab: LibraryTab) => void;
  onSync: (libraryIds?: string[]) => void;
  onRemove: (libraryId: string) => void;
  isInstalling: boolean;
  onInstall: (rules: LibraryRuleRow[]) => void;
  onInstallAll: (libraryId: string) => void;
  onOpenRule: (rule: LibraryRuleRow) => void;
}

export const LibraryBody = ({
  libraries,
  selectedLibrary,
  selectedLibraryId,
  isAllSelected,
  rules,
  exceptionLists,
  valueLists,
  activeTab,
  canEdit,
  onSelectTab,
  onSync,
  onRemove,
  isInstalling,
  onInstall,
  onInstallAll,
  onOpenRule,
}: LibraryBodyProps) => {
  const isNeverSynced = Boolean(selectedLibrary && !selectedLibrary.version);
  const isAnySyncing = libraries.some(({ syncStatus }) => syncStatus === 'syncing');

  return (
    <>
      {selectedLibrary ? (
        <>
          <LibraryHeader
            library={selectedLibrary}
            canSync={canEdit}
            canRemove={canEdit}
            onSync={(libraryId) => onSync([libraryId])}
            onRemove={onRemove}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <LibraryTabs
        activeTab={activeTab}
        counts={{
          rules: rules.total,
          exceptionLists: exceptionLists.length,
          valueLists: valueLists.length,
        }}
        onSelect={onSelectTab}
      />
      {isNeverSynced && selectedLibrary ? (
        <LibraryNotSynced
          isSyncing={selectedLibrary.syncStatus === 'syncing'}
          canSync={canEdit}
          onSync={() => onSync([selectedLibrary.id])}
        />
      ) : null}
      {!isNeverSynced && activeTab === 'rules' && rules.isError ? (
        <KbnDangerCallout
          announceOnMount
          title={i18n.LOAD_RULES_ERROR_TITLE}
          data-test-subj="ruleLibraryRulesLoadError"
        />
      ) : null}
      {!isNeverSynced && activeTab === 'rules' && !rules.isError ? (
        <LibraryRulesTable
          key={selectedLibraryId}
          rules={rules.rules}
          total={rules.total}
          isLoading={rules.isLoading}
          libraries={libraries}
          showLibrary={isAllSelected}
          canInstall={canEdit}
          canSync={canEdit}
          isSyncingAll={isAnySyncing}
          isInstalling={isInstalling}
          onSyncAll={isAllSelected ? () => onSync() : undefined}
          onInstall={onInstall}
          // Several libraries can have the same rule, so rules are installed all at once from one library.
          onInstallAll={isAllSelected ? undefined : () => onInstallAll(selectedLibraryId)}
          onOpenRule={onOpenRule}
          query={rules.query}
          onQueryChange={rules.onQueryChange}
          tags={rules.tags}
          onTagsChange={rules.onTagsChange}
          availableTags={rules.availableTags}
          tactics={rules.tactics}
          onTacticsChange={rules.onTacticsChange}
          pagination={rules.pagination}
          onPaginationChange={rules.onPaginationChange}
          sort={rules.sort}
          onSortChange={rules.onSortChange}
        />
      ) : null}
      {!isNeverSynced && activeTab !== 'rules' ? (
        <LibraryListsPlaceholder
          key={activeTab}
          showLibrary={isAllSelected}
          kind={activeTab}
          rows={activeTab === 'exceptionLists' ? exceptionLists : valueLists}
          libraries={libraries}
        />
      ) : null}
    </>
  );
};
