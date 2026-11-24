/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSelectable,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import {
  useBulkAssignRuleGroupsMutation,
  useRuleGroupsMembershipQuery,
  useRuleGroupsQuery,
} from '../api';
import { groupColor } from './group_color';
import * as i18n from './translations';

type State = 'all' | 'some' | 'none';

interface RuleGroupsSelectableProps {
  /** Saved object ids of the rules. */
  ruleIds: string[];
  /** rule_ids of the same rules, to start a new group with them picked. */
  ruleRuleIds: string[];
  onDone: () => void;
  onNewGroup: (ruleRuleIds: string[]) => void;
}

/**
 * Checkbox per group, like labels in a mail client: all rules in the group (on), some (mixed), none.
 * Check to add the rules, uncheck to remove them, then Apply.
 */
export const RuleGroupsSelectable = ({
  ruleIds,
  ruleRuleIds,
  onDone,
  onNewGroup,
}: RuleGroupsSelectableProps) => {
  const { data: groupsData } = useRuleGroupsQuery();
  const { data: membership, isLoading } = useRuleGroupsMembershipQuery(ruleIds, true);
  const { mutateAsync: bulkAssign, isLoading: isApplying } = useBulkAssignRuleGroupsMutation();
  const { addSuccess, addError } = useAppToasts();
  const [initial, setInitial] = useState<Record<string, State>>({});
  const [state, setState] = useState<Record<string, State>>({});

  useEffect(() => {
    if (!membership) return;
    const next = Object.fromEntries(membership.groups.map(({ id, state: s }) => [id, s]));
    setInitial(next);
    setState(next);
  }, [membership]);

  const groups = groupsData?.groups ?? [];
  const changed = groups.filter((group) => state[group.id] !== initial[group.id]);

  const options: EuiSelectableOption[] = groups.map((group) => ({
    key: group.id,
    label: group.name,
    checked: state[group.id] === 'all' ? 'on' : state[group.id] === 'some' ? 'mixed' : undefined,
    prepend: <EuiIcon type="folder" color={groupColor(group.id)} aria-hidden={true} />,
  }));

  const apply = async () => {
    try {
      await bulkAssign({
        ids: ruleIds,
        add_to: changed.filter((group) => state[group.id] === 'all').map(({ id }) => id),
        remove_from: changed.filter((group) => state[group.id] === 'none').map(({ id }) => id),
      });
      addSuccess(i18n.MENU_APPLIED_TOAST);
      onDone();
    } catch (error) {
      addError(error, { title: i18n.SAVE_ERROR });
    }
  };

  return (
    <div css={{ width: 320 }} data-test-subj="ruleGroupsMenu">
      <EuiPanel paddingSize="s" hasShadow={false}>
        <EuiText size="xs">
          <strong>{i18n.MENU_TITLE(ruleIds.length)}</strong>
        </EuiText>
      </EuiPanel>
      {isLoading ? (
        <EuiPanel paddingSize="s" hasShadow={false}>
          <EuiSkeletonText lines={3} />
        </EuiPanel>
      ) : (
        <EuiSelectable
          searchable
          searchProps={{ placeholder: i18n.FIND_GROUP, compressed: true }}
          options={options}
          onChange={(_options, _event, changedOption) => {
            const id = changedOption.key as string;
            // all → none → (back to mixed, if it started mixed) → all
            setState((current) => {
              const next: State =
                current[id] === 'all'
                  ? 'none'
                  : current[id] === 'none' && initial[id] === 'some'
                  ? 'some'
                  : 'all';
              return { ...current, [id]: next };
            });
          }}
          height={Math.min(240, Math.max(1, options.length) * 32 + 4)}
        >
          {(list, search) => (
            <>
              <div css={{ padding: '0 8px 8px' }}>{search}</div>
              {list}
            </>
          )}
        </EuiSelectable>
      )}
      <EuiHorizontalRule margin="none" />
      <EuiPanel paddingSize="s" hasShadow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="plus"
          flush="left"
          onClick={() => {
            onDone();
            onNewGroup(ruleRuleIds);
          }}
        >
          {i18n.MENU_NEW_GROUP(ruleIds.length)}
        </EuiButtonEmpty>
      </EuiPanel>
      {changed.length > 0 && (
        <>
          <EuiHorizontalRule margin="none" />
          <EuiPanel paddingSize="s" hasShadow={false}>
            <EuiText size="xs" color="subdued">
              <p>{i18n.MENU_LEAVE_OUT_NOTE}</p>
            </EuiText>
            <EuiButton
              size="s"
              fill
              fullWidth
              onClick={apply}
              isLoading={isApplying}
              data-test-subj="ruleGroupsMenuApply"
            >
              {i18n.MENU_APPLY}
            </EuiButton>
          </EuiPanel>
        </>
      )}
    </div>
  );
};
