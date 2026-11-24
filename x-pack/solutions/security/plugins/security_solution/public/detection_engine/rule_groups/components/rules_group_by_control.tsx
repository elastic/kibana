/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import type { RuleGroup } from '../../../../common/api/detection_engine/rule_groups';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useRuleGroupsQuery, useSaveRuleGroupMutation } from '../api';
import { describeConditionParts, mergeConditions } from './condition_labels';
import { useRuleGroupEditor } from './rule_group_editor_context';
import {
  GROUP_BY_FIELDS,
  filtersToGroupConditions,
  groupByValueLabel,
  useIntegrationTitles,
} from './group_by_fields';
import * as i18n from './translations';

/** The visible filters that a group can store, cleared after they move into the group. */
const CLEARED_GROUP_FILTERS = {
  filter: '',
  tags: [],
  showElasticRules: false,
  showCustomRules: false,
  includeRuleTypes: undefined,
  browse: undefined,
};

/** The conditions of the selected group, as chips next to the visible filters. */
const GroupConditionChips = ({
  group,
  integrationTitles,
}: {
  group: RuleGroup;
  integrationTitles: Map<string, string>;
}) => {
  const { openEditor } = useRuleGroupEditor();
  const parts = [
    ...describeConditionParts(group.conditions, integrationTitles),
    ...(group.included_rule_ids.length ? [i18n.PICKED(group.included_rule_ids.length)] : []),
    ...(group.excluded_rule_ids.length ? [i18n.LEFT_OUT(group.excluded_rule_ids.length)] : []),
  ];
  return (
    <>
      {parts.map((part) => (
        <EuiFlexItem grow={false} key={part}>
          <EuiToolTip content={i18n.GROUP_CONDITION_TOOLTIP(group.name)}>
            <EuiBadge
              color="hollow"
              iconType="folder"
              onClick={() => openEditor({ group })}
              onClickAriaLabel={i18n.EDIT_GROUP}
              data-test-subj="ruleGroupConditionChip"
            >
              {part}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </>
  );
};

const SaveFiltersButton = ({ group }: { group?: RuleGroup }) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { openEditor } = useRuleGroupEditor();
  const { mutateAsync: save } = useSaveRuleGroupMutation();
  const { addSuccess, addError } = useAppToasts();
  const filters = filtersToGroupConditions(filterOptions);
  const hasFilters = Object.keys(filters).length > 0;

  const button = (onClick: () => void) => (
    <EuiToolTip content={hasFilters ? i18n.SAVE_FILTERS_HELP : i18n.SAVE_FILTERS_DISABLED_HELP}>
      <EuiButtonEmpty
        size="xs"
        iconType="folderOpen"
        iconSide="left"
        isDisabled={!hasFilters}
        onClick={onClick}
        data-test-subj="ruleGroupsSaveFilters"
      >
        {group ? i18n.SAVE_FILTERS : i18n.SAVE_FILTERS_AS_GROUP}
      </EuiButtonEmpty>
    </EuiToolTip>
  );

  if (!group) {
    return button(() => openEditor({ initial: { conditions: filters } }));
  }

  const merged = mergeConditions(group.conditions, filters);
  const addToGroup = async () => {
    setIsOpen(false);
    try {
      const { id, version, name, description, visibility, included_rule_ids, excluded_rule_ids } =
        group;
      await save({
        id,
        version,
        name,
        description,
        visibility,
        conditions: merged,
        included_rule_ids,
        excluded_rule_ids,
      });
      // The filters are part of the group now; showing them twice would hide nothing new.
      setFilterOptions(CLEARED_GROUP_FILTERS);
      addSuccess(i18n.FILTERS_ADDED_TOAST(group.name));
    } catch (error) {
      addError(error, { title: i18n.SAVE_ERROR });
    }
  };

  return (
    <EuiPopover
      aria-label={i18n.SAVE_FILTERS}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={button(() => setIsOpen(!isOpen))}
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="add"
            icon="plusCircle"
            onClick={addToGroup}
            disabled={!group.is_owner && group.visibility === 'private'}
            data-test-subj="ruleGroupsAddFiltersToGroup"
          >
            {i18n.ADD_FILTERS_TO_GROUP(group.name)}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="new"
            icon="folderOpen"
            onClick={() => {
              setIsOpen(false);
              openEditor({
                initial: {
                  conditions: merged,
                  included_rule_ids: group.included_rule_ids,
                  excluded_rule_ids: group.excluded_rule_ids,
                  visibility: group.visibility,
                },
              });
            }}
            data-test-subj="ruleGroupsSaveAsNewGroup"
          >
            {i18n.SAVE_AS_NEW_GROUP}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

/**
 * Row above the rules table. Left: the conditions of the selected group and the section filter.
 * Right: "Save filters" and "Group by". It does not move when rules are selected.
 */
export const RulesGroupByControl = () => {
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const [isOpen, setIsOpen] = useState(false);
  const { groupBy, browse, ruleGroupId } = filterOptions;
  const { data } = useRuleGroupsQuery();
  const group = data?.groups.find(({ id }) => id === ruleGroupId);
  const selected = GROUP_BY_FIELDS.find((field) => field.value === groupBy);
  const browseField = browse && GROUP_BY_FIELDS.find((field) => field.value === browse.category);
  const integrationTitles = useIntegrationTitles();
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      {group && <GroupConditionChips group={group} integrationTitles={integrationTitles} />}
      {browse && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="primary"
            iconType="cross"
            iconSide="right"
            iconOnClick={() => setFilterOptions({ browse: undefined })}
            iconOnClickAriaLabel={i18n.BROWSE_FILTER_CLEAR}
            data-test-subj="ruleGroupsSectionFilter"
          >
            {`${browseField?.text ?? browse.category}: ${groupByValueLabel(
              browse.category,
              browse.value,
              integrationTitles
            )}`}
          </EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={true} />
      {canEditRules && (
        <EuiFlexItem grow={false}>
          <SaveFiltersButton group={group} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.GROUP_BY}
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downRight"
          button={
            <EuiButtonEmpty
              size="xs"
              iconType="chevronSingleDown"
              iconSide="right"
              onClick={() => setIsOpen(!isOpen)}
              data-test-subj="ruleGroupsGroupBy"
            >
              {i18n.GROUP_BY}
              {': '}
              <strong>{selected?.text ?? i18n.GROUP_BY_NONE}</strong>
            </EuiButtonEmpty>
          }
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                key="none"
                icon={groupBy ? 'empty' : 'check'}
                onClick={() => {
                  setIsOpen(false);
                  setFilterOptions({ groupBy: undefined });
                }}
              >
                {i18n.GROUP_BY_NONE}
              </EuiContextMenuItem>,
              ...GROUP_BY_FIELDS.map((field) => (
                <EuiContextMenuItem
                  key={field.value}
                  icon={groupBy === field.value ? 'check' : 'empty'}
                  onClick={() => {
                    setIsOpen(false);
                    setFilterOptions({ groupBy: field.value, browse: undefined });
                  }}
                  data-test-subj={`ruleGroupsGroupBy-${field.value}`}
                >
                  {field.text}
                </EuiContextMenuItem>
              )),
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
