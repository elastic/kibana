/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useResizeObserver,
} from '@elastic/eui';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { SeverityBadge } from '../../../../../common/components/severity_badge';
import { RuleLibraryBadge } from '../../../../common/components/rule_library_badge';
import { useIntegrations } from '../../../../common/components/related_integrations/use_integrations';
import type { LibraryRuleIntegration, LibraryRuleRow, RuleLibraryListItem } from '../types';
import * as i18n from '../translations';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
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

  const getPackageVersion = (packageName: string) =>
    knownIntegrations?.find((known) => known.package_name === packageName)?.latest_package_version;

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {integrations.map(({ packageName, title }) => {
        const version = getPackageVersion(packageName);
        return (
          <EuiFlexItem key={packageName} grow={false}>
            {version ? (
              <EuiToolTip content={title}>
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
      {tags.map((tag) => (
        <EuiFlexItem key={tag} grow={false}>
          <EuiBadge color="hollow">{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

interface InstallActionProps {
  rule: LibraryRuleRow;
  canInstall: boolean;
  onInstall: (ruleIds: string[]) => void;
}

const InstallAction = ({ rule, canInstall, onInstall }: InstallActionProps) => {
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
      isDisabled={!canInstall}
      onClick={() => onInstall([rule.id])}
      data-test-subj="installLibraryRuleButton"
    >
      {i18n.INSTALL}
    </EuiButton>
  );
};

interface LibraryRulesTableProps {
  rules: readonly LibraryRuleRow[];
  libraries: readonly RuleLibraryListItem[];
  canInstall: boolean;
  canRefresh: boolean;
  isRefreshingAll: boolean;
  onRefreshAll?: () => void;
  onInstall: (ruleIds: string[]) => void;
}

export const LibraryRulesTable = ({
  rules,
  libraries,
  canInstall,
  canRefresh,
  isRefreshingAll,
  onRefreshAll,
  onInstall,
}: LibraryRulesTableProps) => {
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);
  const { width: containerWidth } = useResizeObserver(containerElement, 'width');
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LibraryRuleRow[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE_OPTIONS[0] });

  const filteredRules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return rules;
    }
    return rules.filter(({ name, tags }) =>
      [name, ...tags].join(' ').toLowerCase().includes(normalizedQuery)
    );
  }, [rules, query]);

  const pageOfRules = filteredRules.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const installSelected = () => {
    onInstall(selected.map(({ id }) => id));
    setSelected([]);
    setSelectionResetKey((current) => current + 1);
  };

  const isMeasured = containerWidth > 0;
  const showSeverityColumn = !isMeasured || containerWidth >= SEVERITY_MIN_WIDTH;
  const showRiskScoreColumn = !isMeasured || containerWidth >= RISK_SCORE_MIN_WIDTH;

  const columns: Array<EuiBasicTableColumn<LibraryRuleRow>> = [
    {
      name: i18n.COLUMN_RULE,
      render: ({ name, description, libraryId, integrations, tags }: LibraryRuleRow) => {
        const library = libraries.find(({ id }) => id === libraryId);
        return (
          <div>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{name}</strong>
                </EuiText>
              </EuiFlexItem>
              {library ? (
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
            <RuleBadges integrations={integrations} tags={tags} />
          </div>
        );
      },
    },
    ...(showSeverityColumn
      ? [
          {
            name: i18n.COLUMN_SEVERITY,
            width: SEVERITY_COLUMN_WIDTH,
            render: ({ severity }: LibraryRuleRow) => <SeverityBadge value={severity} />,
          },
        ]
      : []),
    ...(showRiskScoreColumn
      ? [
          {
            field: 'riskScore',
            name: i18n.COLUMN_RISK_SCORE,
            width: RISK_SCORE_COLUMN_WIDTH,
          },
        ]
      : []),
    {
      name: '',
      align: 'right',
      width: ACTION_COLUMN_WIDTH,
      render: (rule: LibraryRuleRow) => (
        <InstallAction rule={rule} canInstall={canInstall} onInstall={onInstall} />
      ),
    },
  ];

  return (
    <div ref={setContainerElement}>
      <EuiFieldSearch
        fullWidth
        value={query}
        placeholder={i18n.SEARCH_RULES_PLACEHOLDER}
        aria-label={i18n.SEARCH_RULES_ARIA_LABEL}
        onChange={(event) => {
          setQuery(event.target.value);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
        data-test-subj="ruleLibrariesSearch"
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.SHOWING_RULES(filteredRules.length)}
          </EuiText>
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
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            isDisabled={!canInstall || selected.length === 0}
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
        items={pageOfRules}
        itemId="id"
        columns={columns}
        noItemsMessage={i18n.NO_RULES}
        selection={{
          selectable: ({ installState }) => installState === 'installable',
          onSelectionChange: setSelected,
        }}
        pagination={{
          ...pagination,
          totalItemCount: filteredRules.length,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        onChange={({ page }: CriteriaWithPagination<LibraryRuleRow>) =>
          setPagination({ pageIndex: page.index, pageSize: page.size })
        }
        data-test-subj="ruleLibraryRulesTable"
      />
    </div>
  );
};
