/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { RuleSetSummary } from '../../../../common/api/detection_engine/rule_sets';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useRuleManagementFilters } from '../../rule_management/logic/use_rule_management_filters';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { fetchRuleSet, useRuleSetsWithCountsQuery, useSaveRuleSetMutation } from '../api';
import { describeConditionParts, mergeConditions } from './condition_labels';
import { useRuleSetEditor } from './rule_set_editor_context';
import {
  GROUP_BY_FIELDS,
  filtersToGroupConditions,
  groupByValueLabel,
  useIntegrationTitles,
} from './group_by_fields';
import { ActiveFacetChips } from '../facets/active_facet_chips';
import * as i18n from './translations';

/** The visible filters that a set can store, cleared after they move into the set. */
const CLEARED_GROUP_FILTERS = {
  conditions: undefined,
  filter: '',
  tags: [],
  showElasticRules: false,
  showCustomRules: false,
  includeRuleTypes: undefined,
  browse: undefined,
};

/** What a set is: its conditions and its picked and left-out rules, as small chips. */
export const RuleSetConditionChips = ({ group }: { group: RuleSetSummary }) => {
  const { openEditor } = useRuleSetEditor();
  const integrationTitles = useIntegrationTitles();
  const parts = [
    ...describeConditionParts(group.conditions, integrationTitles),
    ...(group.included_rules_count ? [i18n.PICKED(group.included_rules_count)] : []),
    ...(group.excluded_rules_count ? [i18n.LEFT_OUT(group.excluded_rules_count)] : []),
  ];
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {parts.map((part) => (
        <EuiFlexItem grow={false} key={part}>
          <EuiToolTip content={i18n.GROUP_CONDITION_TOOLTIP(group.name)}>
            <EuiBadge
              color="hollow"
              iconType="filter"
              onClick={() => openEditor({ ruleSetId: group.id })}
              onClickAriaLabel={i18n.EDIT_GROUP}
              data-test-subj="ruleSetConditionChip"
            >
              {part}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

/** "Group by" next to the search: a view setting, not a filter. */
export const RulesGroupByButton = () => {
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const [isOpen, setIsOpen] = useState(false);
  const { groupBy } = filterOptions;
  const selected = GROUP_BY_FIELDS.find((field) => field.value === groupBy);

  return (
    <EuiPopover
      aria-label={i18n.GROUP_BY}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiButtonEmpty
          size="s"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj="ruleSetsGroupBy"
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
              data-test-subj={`ruleSetsGroupBy-${field.value}`}
            >
              {field.text}
            </EuiContextMenuItem>
          )),
        ]}
      />
    </EuiPopover>
  );
};

/** Explicit save of the current filters: into the selected set, as a new set, or reset. */
const SaveActions = ({ group }: { group?: RuleSetSummary }) => {
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { openEditor } = useRuleSetEditor();
  const { mutateAsync: save, isLoading: isSaving } = useSaveRuleSetMutation();
  const { addSuccess, addError } = useAppToasts();
  const filters = filtersToGroupConditions(filterOptions);

  if (!group) {
    return (
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          fill
          iconType="folderOpen"
          onClick={() => openEditor({ initial: { conditions: filters } })}
          data-test-subj="ruleSetsSaveFilters"
        >
          {i18n.SAVE_FILTERS_AS_GROUP}
        </EuiButton>
      </EuiFlexItem>
    );
  }

  const saveToSet = async () => {
    try {
      // The list has no rule id lists; read the full set, then write it back with the filters.
      const { id, version, name, description, visibility, included_rule_ids, excluded_rule_ids } =
        await fetchRuleSet(group.id);
      await save({
        id,
        version,
        name,
        description,
        visibility,
        conditions: mergeConditions(group.conditions, filters),
        included_rule_ids,
        excluded_rule_ids,
      });
      // The filters are part of the set now; showing them twice would hide nothing new.
      setFilterOptions(CLEARED_GROUP_FILTERS);
      addSuccess(i18n.FILTERS_ADDED_TOAST(group.name));
    } catch (error) {
      addError(error, { title: i18n.SAVE_ERROR });
    }
  };

  const saveAsNew = async () => {
    try {
      const full = await fetchRuleSet(group.id);
      openEditor({
        initial: {
          conditions: mergeConditions(full.conditions, filters),
          included_rule_ids: full.included_rule_ids,
          excluded_rule_ids: full.excluded_rule_ids,
          visibility: full.visibility,
        },
      });
    } catch (error) {
      addError(error, { title: i18n.SAVE_ERROR });
    }
  };

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="refresh"
          onClick={() => setFilterOptions(CLEARED_GROUP_FILTERS)}
          data-test-subj="ruleSetsResetFilters"
        >
          {i18n.RESET_FILTERS}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" onClick={saveAsNew} data-test-subj="ruleSetsSaveAsNewGroup">
          {i18n.SAVE_AS_NEW_SET}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.SAVE_TO_SET_HELP(group.name)}>
          <EuiButton
            size="s"
            fill
            iconType="save"
            isLoading={isSaving}
            isDisabled={!group.is_owner && group.visibility === 'private'}
            onClick={saveToSet}
            data-test-subj="ruleSetsAddFiltersToGroup"
          >
            {i18n.SAVE_TO_SET}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </>
  );
};

/**
 * The current filters above the table: how many rules they leave, the filter chips, and the
 * explicit save actions. Shown only with a filter. The selected set does not change until
 * "Save to set".
 */
export const RulesFilterBar = () => {
  const {
    state: { filterOptions, pagination, isFetching },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { browse, ruleSetId } = filterOptions;
  const { data: sets } = useRuleSetsWithCountsQuery();
  const { data: ruleManagementFilters } = useRuleManagementFilters();
  const integrationTitles = useIntegrationTitles();
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const group = sets?.find(({ id }) => id === ruleSetId);
  const browseField = browse && GROUP_BY_FIELDS.find((field) => field.value === browse.category);
  const hasFilters = Object.keys(filtersToGroupConditions(filterOptions)).length > 0;

  if (!hasFilters && !browse) {
    return null;
  }

  // While the table loads, its total is the one of the previous filters.
  const shown = isFetching ? undefined : pagination.total;
  const summary = ruleSetId
    ? i18n.FILTERS_CHANGED(shown, group?.rules_count, group?.name ?? '')
    : i18n.FILTERS_MATCH(
        shown,
        ruleManagementFilters &&
          ruleManagementFilters.rules_summary.custom_count +
            ruleManagementFilters.rules_summary.prebuilt_installed_count
      );

  return (
    <>
      <EuiPanel
        color={ruleSetId ? 'warning' : 'subdued'}
        paddingSize="s"
        hasShadow={false}
        data-test-subj="ruleSetsFilterBar"
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem css={{ minWidth: 240 }}>
            <EuiText size="s" data-test-subj="ruleSetsFilterBarSummary">
              {summary}
            </EuiText>
          </EuiFlexItem>
          {canEditRules && hasFilters && <SaveActions group={ruleSetId ? group : undefined} />}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
          <ActiveFacetChips
            conditions={filterOptions.conditions ?? {}}
            onChange={(next) => setFilterOptions({ conditions: next })}
          />
          {browse && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="primary"
                iconType="cross"
                iconSide="right"
                iconOnClick={() => setFilterOptions({ browse: undefined })}
                iconOnClickAriaLabel={i18n.BROWSE_FILTER_CLEAR}
                data-test-subj="ruleSetsSectionFilter"
              >
                {`${browseField?.text ?? browse.category}: ${groupByValueLabel(
                  browse.category,
                  browse.value,
                  integrationTitles
                )}`}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};
