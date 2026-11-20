/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useResizeObserver,
} from '@elastic/eui';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { SeverityBadge } from '../../../../../common/components/severity_badge';
import { RuleLibraryBadge } from '../../../../common/components/rule_library_badge';
import { TagsFilterPopover } from '../../../components/rules_table/rules_table_filters/tags_filter_popover';
import { PAGE_SIZE_OPTIONS } from '../constants';
import { MitreTacticFilter } from './mitre_tactic_filter';
import { useIntegrations } from '../../../../common/components/related_integrations/use_integrations';
import type {
  LibraryRuleIntegration,
  LibraryRuleRow,
  LibraryRulesSort,
  RuleLibraryListItem,
} from '../types';
import * as i18n from '../translations';

const SEARCH_DEBOUNCE_MS = 300;
const VISIBLE_TAGS = 3;
const DESCRIPTION_MAX_LENGTH = 70;
const RISK_SCORE_MIN_WIDTH = 900;
const SEVERITY_MIN_WIDTH = 850;
const SEVERITY_COLUMN_WIDTH = '110px';
const RISK_SCORE_COLUMN_WIDTH = '100px';
const ACTION_COLUMN_WIDTH = '130px';

const truncateDescription = (description: string): string =>
  description.length > DESCRIPTION_MAX_LENGTH
    ? `${description.slice(0, DESCRIPTION_MAX_LENGTH).trimEnd()}…`
    : description;

interface RuleBadgesProps {
  integrations: readonly LibraryRuleIntegration[];
  tags: readonly string[];
}

const RuleBadges = ({ integrations, tags }: RuleBadgesProps) => {
  const { data: knownIntegrations } = useIntegrations();

  const findKnownIntegration = (packageName: string) =>
    knownIntegrations?.find((known) => known.package_name === packageName);

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
      {integrations.map(({ packageName, title: fallbackTitle }) => {
        const known = findKnownIntegration(packageName);
        const version = known?.latest_package_version;
        const title = known?.package_title ?? fallbackTitle;
        return (
          <EuiFlexItem key={packageName} grow={false}>
            {version ? (
              <EuiToolTip content={title} anchorProps={{ css: { display: 'flex' } }}>
                <PackageIcon
                  packageName={packageName}
                  version={version}
                  tryApi
                  size="m"
                  aria-label={title}
                  tabIndex={0}
                />
              </EuiToolTip>
            ) : (
              <EuiBadge color="hollow">{title}</EuiBadge>
            )}
          </EuiFlexItem>
        );
      })}
      {tags.slice(0, VISIBLE_TAGS).map((tag) => (
        <EuiFlexItem key={tag} grow={false}>
          <EuiBadge color="hollow">{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
      {tags.length > VISIBLE_TAGS ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={tags.slice(VISIBLE_TAGS).map((tag) => (
              <div key={tag}>{tag}</div>
            ))}
            anchorProps={{ css: { display: 'flex' } }}
          >
            <EuiBadge color="hollow" tabIndex={0} data-test-subj="ruleLibraryMoreTags">
              {i18n.MORE_TAGS(tags.length - VISIBLE_TAGS)}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

interface InstallActionProps {
  rule: LibraryRuleRow;
  canInstall: boolean;
  isInstalling: boolean;
  onInstall: (rules: LibraryRuleRow[]) => void;
}

const InstallAction = ({ rule, canInstall, isInstalling, onInstall }: InstallActionProps) => {
  if (rule.installState === 'installed') {
    return (
      <EuiButton size="s" isDisabled>
        {i18n.INSTALLED}
      </EuiButton>
    );
  }

  if (rule.installState === 'installed_from_other_library') {
    return (
      <EuiToolTip content={i18n.ALREADY_INSTALLED_TOOLTIP(rule.installedFromLibraryTitle ?? '')}>
        <EuiButton size="s" isDisabled>
          {i18n.ALREADY_INSTALLED}
        </EuiButton>
      </EuiToolTip>
    );
  }

  return (
    <EuiButton
      size="s"
      fill
      isDisabled={!canInstall || isInstalling}
      onClick={() => onInstall([rule])}
      data-test-subj="installLibraryRuleButton"
    >
      {i18n.INSTALL}
    </EuiButton>
  );
};

interface LibraryRulesTableProps {
  rules: readonly LibraryRuleRow[];
  total: number;
  isLoading: boolean;
  libraries: readonly RuleLibraryListItem[];
  // Whether to show which library each rule comes from. It is only worth it when several libraries are listed.
  showLibrary: boolean;
  canInstall: boolean;
  canRefresh: boolean;
  isRefreshingAll: boolean;
  isInstalling: boolean;
  onRefreshAll?: () => void;
  onInstall: (rules: LibraryRuleRow[]) => void;
  onInstallAll?: () => void;
  onOpenRule: (rule: LibraryRuleRow) => void;
  query: string;
  onQueryChange: (query: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags: string[];
  tactics: readonly string[];
  onTacticsChange: (tactics: string[]) => void;
  pagination: { pageIndex: number; pageSize: number };
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  sort?: LibraryRulesSort;
  onSortChange: (sort?: LibraryRulesSort) => void;
}

export const LibraryRulesTable = ({
  rules,
  total,
  isLoading,
  libraries,
  showLibrary,
  canInstall,
  canRefresh,
  isRefreshingAll,
  isInstalling,
  onRefreshAll,
  onInstall,
  onInstallAll,
  onOpenRule,
  query,
  onQueryChange,
  tags,
  onTagsChange,
  availableTags,
  tactics,
  onTacticsChange,
  pagination,
  onPaginationChange,
  sort,
  onSortChange,
}: LibraryRulesTableProps) => {
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);
  const { width: containerWidth } = useResizeObserver(containerElement, 'width');
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [searchText, setSearchText] = useState(query);
  const [selected, setSelected] = useState<LibraryRuleRow[]>([]);

  useDebounce(() => onQueryChange(searchText), SEARCH_DEBOUNCE_MS, [searchText]);

  const installSelected = () => {
    onInstall(selected);
    setSelected([]);
    setSelectionResetKey((current) => current + 1);
  };

  const isMeasured = containerWidth > 0;
  const showSeverityColumn = !isMeasured || containerWidth >= SEVERITY_MIN_WIDTH;
  const showRiskScoreColumn = !isMeasured || containerWidth >= RISK_SCORE_MIN_WIDTH;

  const columns: Array<EuiBasicTableColumn<LibraryRuleRow>> = [
    {
      field: 'name',
      name: i18n.COLUMN_RULE,
      sortable: true,
      render: (_name: string, rule: LibraryRuleRow) => {
        const { name, description, libraryId, integrations, tags: ruleTags } = rule;
        const library = libraries.find(({ id }) => id === libraryId);
        return (
          <div>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiLink onClick={() => onOpenRule(rule)} data-test-subj="ruleLibraryRuleName">
                  <strong>{name}</strong>
                </EuiLink>
              </EuiFlexItem>
              {library && showLibrary ? (
                <EuiFlexItem grow={false}>
                  <RuleLibraryBadge
                    library={{ id: library.id, title: library.title, icon: library.icon }}
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiToolTip content={description.length > DESCRIPTION_MAX_LENGTH ? description : null}>
              <EuiText size="xs" color="subdued" tabIndex={0}>
                {truncateDescription(description)}
              </EuiText>
            </EuiToolTip>
            <EuiSpacer size="xs" />
            <RuleBadges integrations={integrations} tags={ruleTags} />
          </div>
        );
      },
    },
    ...(showSeverityColumn
      ? [
          {
            field: 'severity',
            name: i18n.COLUMN_SEVERITY,
            width: SEVERITY_COLUMN_WIDTH,
            sortable: true,
            render: (_severity: string, { severity }: LibraryRuleRow) => (
              <SeverityBadge value={severity} />
            ),
          },
        ]
      : []),
    ...(showRiskScoreColumn
      ? [
          {
            field: 'riskScore',
            name: i18n.COLUMN_RISK_SCORE,
            width: RISK_SCORE_COLUMN_WIDTH,
            sortable: true,
          },
        ]
      : []),
    {
      name: '',
      align: 'right',
      width: ACTION_COLUMN_WIDTH,
      render: (rule: LibraryRuleRow) => (
        <InstallAction
          rule={rule}
          canInstall={canInstall}
          isInstalling={isInstalling}
          onInstall={onInstall}
        />
      ),
    },
  ];

  return (
    <div ref={setContainerElement}>
      <EuiFieldSearch
        fullWidth
        value={searchText}
        placeholder={i18n.SEARCH_RULES_PLACEHOLDER}
        aria-label={i18n.SEARCH_RULES_ARIA_LABEL}
        onChange={(event) => setSearchText(event.target.value)}
        data-test-subj="ruleLibrariesSearch"
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.SHOWING_RULES(total)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MitreTacticFilter selected={tactics} onChange={onTacticsChange} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TagsFilterPopover
            tags={availableTags}
            selectedTags={tags}
            onSelectedTagsChanged={onTagsChange}
          />
        </EuiFlexItem>
        {onRefreshAll ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="refresh"
              isLoading={isRefreshingAll}
              isDisabled={!canRefresh}
              onClick={onRefreshAll}
              data-test-subj="refreshAllRuleLibrariesButton"
            >
              {i18n.REFRESH_ALL}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
        {onInstallAll ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              isDisabled={!canInstall || isInstalling}
              onClick={onInstallAll}
              data-test-subj="installAllLibraryRulesButton"
            >
              {i18n.INSTALL_ALL}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            isLoading={isInstalling}
            isDisabled={!canInstall || isInstalling || selected.length === 0}
            onClick={installSelected}
            data-test-subj="installSelectedLibraryRulesButton"
          >
            {i18n.INSTALL_SELECTED}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable<LibraryRuleRow>
        key={selectionResetKey}
        tableCaption={i18n.RULES_TABLE_CAPTION}
        tableLayout="auto"
        items={[...rules]}
        loading={isLoading}
        itemId="id"
        columns={columns}
        noItemsMessage={i18n.NO_RULES}
        selection={{
          selectable: ({ installState }) => installState === 'installable',
          onSelectionChange: setSelected,
        }}
        pagination={{
          ...pagination,
          totalItemCount: total,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        sorting={{ sort }}
        onChange={({ page, sort: nextSort }: CriteriaWithPagination<LibraryRuleRow>) => {
          setSelected([]);
          onPaginationChange({ pageIndex: page.index, pageSize: page.size });
          onSortChange(nextSort as LibraryRulesSort | undefined);
        }}
        data-test-subj="ruleLibraryRulesTable"
      />
    </div>
  );
};
