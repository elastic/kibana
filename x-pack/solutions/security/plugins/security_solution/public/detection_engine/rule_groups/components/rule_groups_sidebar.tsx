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
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { RuleGroup } from '../../../../common/api/detection_engine/rule_groups';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { AllRulesTabs } from '../../rule_management_ui/components/rules_table/constants';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import {
  useDeleteRuleGroupMutation,
  useInvalidateRuleGroups,
  useRuleGroupsWithCountsQuery,
} from '../api';
import { useOnRuleSetCreated } from '../rule_set_events';
import { useRuleGroupEditor } from './rule_group_editor_context';
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
      &:hover .ruleGroupsItemMenu,
      &:focus-within .ruleGroupsItemMenu {
        opacity: 1;
      }
    `,
    active: css`
      background: ${euiTheme.colors.backgroundBaseInteractiveSelect};
      &:hover {
        background: ${euiTheme.colors.backgroundBaseInteractiveSelect};
      }
    `,
    menu: css`
      opacity: 0;
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
  menu?: React.ReactNode;
  'data-test-subj'?: string;
}

const NavItem = ({
  isActive,
  label,
  count,
  failed,
  icon,
  onClick,
  menu,
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
        {menu && (
          <EuiFlexItem
            grow={false}
            className="ruleGroupsItemMenu"
            css={styles.menu}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {menu}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};

const GroupMenu = ({ group, onBeforeDelete }: { group: RuleGroup; onBeforeDelete: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { openEditor } = useRuleGroupEditor();
  const { mutateAsync: deleteGroup } = useDeleteRuleGroupMutation();
  const { addSuccess, addError } = useAppToasts();

  return (
    <EuiPopover
      aria-label={i18n.GROUP_ACTIONS(group.name)}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="rightCenter"
      button={
        <EuiToolTip content={i18n.GROUP_ACTIONS(group.name)} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            size="xs"
            color="text"
            aria-label={i18n.GROUP_ACTIONS(group.name)}
            onClick={() => setIsOpen(!isOpen)}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="edit"
            icon="pencil"
            onClick={() => {
              setIsOpen(false);
              openEditor({ group });
            }}
          >
            {i18n.EDIT_GROUP}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            onClick={async () => {
              setIsOpen(false);
              onBeforeDelete();
              try {
                await deleteGroup(group.id);
                addSuccess(i18n.DELETED_TOAST(group.name));
              } catch (error) {
                addError(error, { title: i18n.SAVE_ERROR });
              }
            }}
          >
            {i18n.DELETE_GROUP}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

/** Opens the AI agent with the skill that analyzes the rules and suggests rule sets. */
const useSuggestRuleSets = (): (() => void) | undefined => {
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

const SectionTitle = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="spaceBetween"
    gutterSize="xs"
    responsive={false}
    css={{ padding: '0 4px 0 8px', minHeight: 24 }}
  >
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxxs">
        <h4>{title}</h4>
      </EuiTitle>
    </EuiFlexItem>
    {action && <EuiFlexItem grow={false}>{action}</EuiFlexItem>}
  </EuiFlexGroup>
);

/** Left column of the rules page: all rules, shared groups and the current user's private groups. */
export const RuleGroupsSidebar = ({ onCollapse }: { onCollapse: () => void }) => {
  const { euiTheme } = useEuiTheme();
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { data, isLoading, isFetching } = useRuleGroupsWithCountsQuery();
  const { openEditor } = useRuleGroupEditor();
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const suggestRuleSets = useSuggestRuleSets();
  const invalidateRuleGroups = useInvalidateRuleGroups();
  const [search, setSearch] = useState('');
  // Failed rules matter on the monitoring tab; on the other tabs the badge is noise.
  const [{ tabName }] = useRouteSpy();
  const showFailed = tabName === AllRulesTabs.monitoring;

  const groups = useMemo(() => data?.groups ?? [], [data]);

  // The group id can come from the URL or session storage: it can be deleted, private to another
  // user, or from another space. Then show all rules instead of an error.
  const selectedId = filterOptions.ruleGroupId;
  useEffect(() => {
    // Wait for a refetch: a group that was just created is not in the old list yet.
    if (data && !isFetching && selectedId && !data.groups.some(({ id }) => id === selectedId)) {
      setFilterOptions({ ruleGroupId: undefined });
    }
  }, [data, isFetching, selectedId, setFilterOptions]);

  // A set created from a suggestion in the AI agent chat: show it in the list and open it.
  useOnRuleSetCreated((id) => {
    invalidateRuleGroups();
    setFilterOptions({ ruleGroupId: id });
  });

  const visible = groups.filter((group) =>
    group.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const shared = visible.filter((group) => group.visibility === 'space');
  const mine = visible.filter((group) => group.visibility === 'private');
  const selectGroup = (ruleGroupId: string | undefined) => setFilterOptions({ ruleGroupId });

  const renderGroup = (group: RuleGroup) => (
    <NavItem
      key={group.id}
      isActive={selectedId === group.id}
      label={group.name}
      count={group.rules_count}
      failed={showFailed ? group.failed_count : undefined}
      icon={
        <EuiIcon
          type={group.visibility === 'private' ? 'lock' : 'folder'}
          color={groupColor(group.id)}
          aria-hidden={true}
        />
      }
      onClick={() => selectGroup(group.id)}
      menu={
        canEditRules ? (
          <GroupMenu
            group={group}
            onBeforeDelete={() => {
              // Leave the group before it is deleted, so the table does not ask for a missing group.
              if (selectedId === group.id) selectGroup(undefined);
            }}
          />
        ) : undefined
      }
      data-test-subj={`ruleGroupsSidebarGroup-${group.id}`}
    />
  );

  const renderList = (items: RuleGroup[]) =>
    items.length ? (
      items.map(renderGroup)
    ) : (
      <EuiText size="xs" color="subdued" css={{ padding: '2px 8px' }}>
        {i18n.NO_GROUPS}
      </EuiText>
    );

  return (
    <nav
      aria-label={i18n.RULE_GROUPS}
      data-test-subj="ruleGroupsSidebar"
      css={{
        paddingRight: euiTheme.size.m,
        maxHeight: 'calc(100vh - var(--euiFixedHeadersOffset, 0px) - 24px)',
        overflowY: 'auto',
      }}
    >
      <SectionTitle
        title={i18n.RULE_GROUPS}
        action={
          <EuiFlexGroup gutterSize="none" responsive={false}>
            {suggestRuleSets && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.SUGGEST_RULE_SETS} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="sparkles"
                    size="xs"
                    aria-label={i18n.SUGGEST_RULE_SETS}
                    onClick={suggestRuleSets}
                    data-test-subj="ruleSetsSuggestButton"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            {canEditRules && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.NEW_GROUP} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="plus"
                    size="xs"
                    aria-label={i18n.NEW_GROUP}
                    onClick={() => openEditor({})}
                    data-test-subj="ruleGroupsNewGroupButton"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.HIDE_SIDEBAR} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="menuLeft"
                  size="xs"
                  color="text"
                  aria-label={i18n.HIDE_SIDEBAR}
                  onClick={onCollapse}
                  data-test-subj="ruleGroupsSidebarCollapse"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <EuiSpacer size="xs" />
      <NavItem
        isActive={!selectedId}
        label={i18n.ALL_RULES}
        icon={<EuiIcon type="listBullet" color="subdued" aria-hidden={true} />}
        onClick={() => selectGroup(undefined)}
        data-test-subj="ruleGroupsSidebarAllRules"
      />
      {isLoading ? (
        <EuiSkeletonText lines={4} />
      ) : (
        <>
          {groups.length >= SHOW_SEARCH_FROM && (
            <>
              <EuiSpacer size="s" />
              <EuiFieldSearch
                compressed
                fullWidth
                placeholder={i18n.FIND_GROUP}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </>
          )}
          {groups.length === 0 && suggestRuleSets && (
            <>
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued" css={{ padding: '0 8px' }}>
                {i18n.SUGGEST_RULE_SETS_HELP}
              </EuiText>
              <EuiSpacer size="s" />
              <EuiButton
                size="s"
                iconType="sparkles"
                fullWidth
                onClick={suggestRuleSets}
                data-test-subj="ruleSetsSuggestEmptyButton"
              >
                {i18n.SUGGEST_RULE_SETS}
              </EuiButton>
            </>
          )}
          <EuiSpacer size="m" />
          <SectionTitle title={i18n.SHARED_GROUPS} />
          {renderList(shared)}
          <EuiSpacer size="m" />
          <SectionTitle title={i18n.MY_GROUPS} />
          {renderList(mine)}
        </>
      )}
    </nav>
  );
};
