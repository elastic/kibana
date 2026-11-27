/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { RuleSetSummary } from '../../../../common/api/detection_engine/rule_sets';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { useRuleManagementFilters } from '../../rule_management/logic/use_rule_management_filters';
import { AllRulesTabs } from '../../rule_management_ui/components/rules_table/constants';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import {
  useDeleteRuleSetMutation,
  useInvalidateRuleSets,
  useRuleSetsWithCountsQuery,
} from '../api';
import { useOnRuleSetCreated } from '../rule_set_events';
import { useRuleSetEditor } from './rule_set_editor_context';
import { groupColor } from './group_color';
import * as i18n from './translations';

const SHOW_SEARCH_FROM = 8;

const useItemStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    item: css`
      border-radius: ${euiTheme.border.radius.medium};
      padding: ${euiTheme.size.xs} ${euiTheme.size.s};
      cursor: pointer;
      &:hover {
        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
      }
    `,
    active: css`
      background: ${euiTheme.colors.backgroundBaseInteractiveSelect};
      &:hover {
        background: ${euiTheme.colors.backgroundBaseInteractiveSelect};
      }
    `,
  };
};

interface NavItemProps {
  isActive: boolean;
  label: string;
  count?: number;
  failed?: number;
  icon: React.ReactNode;
  onClick: () => void;
  'data-test-subj'?: string;
}

const NavItem = ({
  isActive,
  label,
  count,
  failed,
  icon,
  onClick,
  'data-test-subj': dataTestSubj,
}: NavItemProps) => {
  const styles = useItemStyles();
  return (
    <div
      css={[styles.item, isActive && styles.active]}
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiText size="s" className="eui-textTruncate" title={label}>
            {isActive ? <strong>{label}</strong> : label}
          </EuiText>
        </EuiFlexItem>
        {failed ? (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.FAILED_TOOLTIP(failed)}>
              <EuiBadge color="danger" tabIndex={0}>
                {failed}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
        {count != null && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {count}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};

const RuleSetIcon = ({ group }: { group?: RuleSetSummary }) =>
  group ? (
    <EuiIcon
      type={group.visibility === 'private' ? 'lock' : 'folder'}
      color={groupColor(group.id)}
      aria-hidden={true}
    />
  ) : (
    <EuiIcon type="listBullet" color="subdued" aria-hidden={true} />
  );

/** Opens the AI agent with the skill that analyzes the rules and suggests rule sets. */
export const useSuggestRuleSets = (): (() => void) | undefined => {
  const { agentBuilder } = useKibana().services;
  const suggest = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: i18n.SUGGEST_RULE_SETS_PROMPT,
      // The user reads the prompt, can add a focus (a team, a platform), and sends it.
      autoSendInitialMessage: false,
      sessionTag: 'security',
    });
  }, [agentBuilder]);
  return agentBuilder?.openChat ? suggest : undefined;
};

const SectionTitle = ({ title }: { title: string }) => (
  <EuiTitle
    size="xxxs"
    css={{ padding: '0 8px', minHeight: 24, display: 'flex', alignItems: 'center' }}
  >
    <h4>{title}</h4>
  </EuiTitle>
);

/**
 * Chooses the rule set that scopes the rules page, above the table. The left column of the page
 * stays free for filters.
 */
export const RuleSetSwitcher = () => {
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { data, isLoading, isFetching } = useRuleSetsWithCountsQuery();
  const { data: ruleManagementFilters } = useRuleManagementFilters();
  const suggestRuleSets = useSuggestRuleSets();
  const invalidateRuleSets = useInvalidateRuleSets();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  // Failed rules matter on the monitoring tab; on the other tabs the badge is noise.
  const [{ tabName }] = useRouteSpy();
  const showFailed = tabName === AllRulesTabs.monitoring;

  const groups = useMemo(() => data ?? [], [data]);
  const selectedId = filterOptions.ruleSetId;
  const selected = groups.find(({ id }) => id === selectedId);

  // The group id can come from the URL or session storage: it can be deleted, private to another
  // user, or from another space. Then show all rules instead of an error.
  useEffect(() => {
    // Wait for a refetch: a group that was just created is not in the old list yet.
    if (data && !isFetching && selectedId && !data.some(({ id }) => id === selectedId)) {
      setFilterOptions({ ruleSetId: undefined });
    }
  }, [data, isFetching, selectedId, setFilterOptions]);

  // A set created from a suggestion in the AI agent chat: show it in the list and open it.
  useOnRuleSetCreated((id) => {
    invalidateRuleSets();
    setFilterOptions({ ruleSetId: id });
  });

  const close = () => {
    setIsOpen(false);
    setSearch('');
  };
  const selectGroup = (ruleSetId: string | undefined) => {
    setFilterOptions({ ruleSetId });
    close();
  };

  const summary = ruleManagementFilters?.rules_summary;
  const allRulesCount = summary
    ? summary.custom_count + summary.prebuilt_installed_count
    : undefined;

  const visible = groups.filter((group) =>
    group.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const shared = visible.filter((group) => group.visibility === 'space');
  const mine = visible.filter((group) => group.visibility === 'private');

  const renderList = (items: RuleSetSummary[]) =>
    items.length ? (
      items.map((group) => (
        <NavItem
          key={group.id}
          isActive={selectedId === group.id}
          label={group.name}
          count={group.rules_count}
          failed={showFailed ? group.failed_count : undefined}
          icon={<RuleSetIcon group={group} />}
          onClick={() => selectGroup(group.id)}
          data-test-subj={`ruleSetsSidebarGroup-${group.id}`}
        />
      ))
    ) : (
      <EuiText size="xs" color="subdued" css={{ padding: '2px 8px' }}>
        {i18n.NO_GROUPS}
      </EuiText>
    );

  const button = (
    <EuiButton
      size="s"
      color="text"
      iconType="chevronSingleDown"
      iconSide="right"
      onClick={() => setIsOpen(!isOpen)}
      aria-label={i18n.CHOOSE_RULE_SET}
      data-test-subj="ruleSetSwitcherButton"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} component="span">
        <EuiFlexItem grow={false} component="span">
          <RuleSetIcon group={selected} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} component="span" css={{ maxWidth: 420, minWidth: 0 }}>
          <span className="eui-textTruncate">
            {i18n.RULE_SET_LABEL} <strong>{selected?.name ?? i18n.ALL_RULES}</strong>
          </span>
        </EuiFlexItem>
        {(selected?.rules_count ?? allRulesCount) != null && (
          <EuiFlexItem grow={false} component="span">
            <EuiBadge color="hollow">{selected?.rules_count ?? allRulesCount}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiButton>
  );

  return (
    <EuiPopover
      aria-label={i18n.RULE_SETS}
      button={button}
      isOpen={isOpen}
      closePopover={close}
      panelPaddingSize="s"
      anchorPosition="downLeft"
      repositionOnScroll
    >
      <nav aria-label={i18n.RULE_SETS} css={{ width: 360 }} data-test-subj="ruleSetsSidebar">
        {groups.length >= SHOW_SEARCH_FROM && (
          <>
            <EuiFieldSearch
              compressed
              fullWidth
              autoFocus
              placeholder={i18n.FIND_GROUP}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <EuiSpacer size="s" />
          </>
        )}
        <div css={{ maxHeight: 420, overflowY: 'auto' }}>
          <NavItem
            isActive={!selectedId}
            label={i18n.ALL_RULES}
            count={allRulesCount}
            icon={<RuleSetIcon />}
            onClick={() => selectGroup(undefined)}
            data-test-subj="ruleSetsSidebarAllRules"
          />
          {isLoading ? (
            <EuiSkeletonText lines={4} />
          ) : (
            <>
              <EuiSpacer size="s" />
              <SectionTitle title={i18n.SHARED_GROUPS} />
              {renderList(shared)}
              <EuiSpacer size="s" />
              <SectionTitle title={i18n.MY_GROUPS} />
              {renderList(mine)}
            </>
          )}
        </div>
        {suggestRuleSets && (
          <>
            <EuiHorizontalRule margin="s" />
            <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" responsive={false}>
              {suggestRuleSets && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="sparkles"
                    onClick={() => {
                      close();
                      suggestRuleSets();
                    }}
                    data-test-subj="ruleSetsSuggestButton"
                  >
                    {i18n.SUGGEST_RULE_SETS}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        )}
      </nav>
    </EuiPopover>
  );
};

/** "More actions" of the selected rule set: today only delete; edit is a button next to it. */
export const RuleSetMoreActions = ({ group }: { group: RuleSetSummary }) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { mutateAsync: deleteGroup } = useDeleteRuleSetMutation();
  const { openSettings } = useRuleSetEditor();
  const { addSuccess, addError } = useAppToasts();

  return (
    <EuiPopover
      aria-label={i18n.GROUP_ACTIONS(group.name)}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiToolTip content={i18n.GROUP_ACTIONS(group.name)} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            display="base"
            size="s"
            aria-label={i18n.GROUP_ACTIONS(group.name)}
            onClick={() => setIsOpen(!isOpen)}
            data-test-subj="ruleSetMoreActions"
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="settings"
            icon="pencil"
            onClick={() => {
              setIsOpen(false);
              openSettings(group.id);
            }}
            data-test-subj="ruleSetSettings"
          >
            {i18n.SETTINGS}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            onClick={async () => {
              setIsOpen(false);
              // Leave the set before it is deleted, so the table does not ask for a missing set.
              setFilterOptions({ ruleSetId: undefined });
              try {
                await deleteGroup(group.id);
                addSuccess(i18n.DELETED_TOAST(group.name));
              } catch (error) {
                addError(error, { title: i18n.SAVE_ERROR });
              }
            }}
            data-test-subj="ruleSetDelete"
          >
            {i18n.DELETE_GROUP}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
