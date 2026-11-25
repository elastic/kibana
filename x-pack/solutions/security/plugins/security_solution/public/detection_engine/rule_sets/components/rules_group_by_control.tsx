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
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type {
  RuleSetDefinition,
  RuleSetSummary,
} from '../../../../common/api/detection_engine/rule_sets';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useRuleManagementFilters } from '../../rule_management/logic/use_rule_management_filters';
import { useRulesTableContext } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { fetchRuleSet, useRuleSetsWithCountsQuery, useSaveRuleSetMutation } from '../api';
import { describeConditionParts } from './condition_labels';
import { RuleSetNameForm, useCreateRuleSet } from './rule_set_name_form';
import { draftConditions, isRuleSetChanged, ruleSetFilterState } from '../table_query';
import {
  GROUP_BY_FIELDS,
  filtersToGroupConditions,
  groupByValueLabel,
  useIntegrationTitles,
} from './group_by_fields';
import { ActiveFacetChips } from '../facets/active_facet_chips';
import * as i18n from './translations';

/** What a set is: its saved conditions and its picked and left-out rules, in one line. */
export const RuleSetDefinitionLine = ({ group }: { group: RuleSetSummary }) => {
  const integrationTitles = useIntegrationTitles();
  const parts = [
    ...describeConditionParts(group.conditions, integrationTitles),
    ...(group.included_rules_count ? [i18n.PICKED(group.included_rules_count)] : []),
    ...(group.excluded_rules_count ? [i18n.LEFT_OUT(group.excluded_rules_count)] : []),
  ];
  if (!parts.length) {
    return null;
  }
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiIcon type="filter" size="s" color="subdued" aria-hidden />
      </EuiFlexItem>
      {parts.map((part, index) => (
        <EuiFlexItem grow={false} key={part}>
          <EuiText size="xs" color="subdued" data-test-subj="ruleSetConditionChip">
            {index > 0 ? `· ${part}` : part}
          </EuiText>
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

/** A button that asks for a name in a popover, then creates a set. */
const SaveAsRuleSetButton = ({
  label,
  fill,
  hint,
  getRules,
  dataTestSubj,
}: {
  label: string;
  fill?: boolean;
  hint: string;
  getRules: () => Promise<RuleSetRules>;
  dataTestSubj: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { create, isLoading } = useCreateRuleSet();
  return (
    <EuiPopover
      aria-label={i18n.SAVE_AS_RULE_SET_TITLE}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelStyle={{ width: 360 }}
      button={
        <EuiButton
          size="s"
          fill={fill}
          iconType={fill ? 'folderOpen' : undefined}
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiButton>
      }
    >
      <EuiPopoverTitle paddingSize="s">{i18n.SAVE_AS_RULE_SET_TITLE}</EuiPopoverTitle>
      {isOpen && (
        <RuleSetNameForm
          hint={hint}
          isSaving={isLoading}
          onCancel={() => setIsOpen(false)}
          onSubmit={async (text) => {
            if (await create(text, await getRules())) setIsOpen(false);
          }}
        />
      )}
    </EuiPopover>
  );
};

type RuleSetRules = Pick<
  RuleSetDefinition,
  'conditions' | 'included_rule_ids' | 'excluded_rule_ids'
>;

/**
 * Explicit save. All rules: a new set from the filters. A changed set: Save writes the facets and
 * the search as its conditions (picked and left-out rules stay), Save as new set copies it with
 * the change, Reset shows the saved set again.
 */
const SaveActions = ({ group }: { group?: RuleSetSummary }) => {
  const {
    state: { filterOptions, pagination },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { mutateAsync: save, isLoading: isSaving } = useSaveRuleSetMutation();
  const { addSuccess, addError } = useAppToasts();

  if (!group) {
    return (
      <EuiFlexItem grow={false}>
        <SaveAsRuleSetButton
          label={i18n.SAVE_FILTERS_AS_GROUP}
          fill
          hint={i18n.HINT_FILTERS(pagination.total)}
          getRules={async () => ({
            conditions: filtersToGroupConditions(filterOptions),
            included_rule_ids: [],
            excluded_rule_ids: [],
          })}
          dataTestSubj="ruleSetsSaveFilters"
        />
      </EuiFlexItem>
    );
  }

  const conditions = draftConditions(filterOptions);
  const saveToSet = async () => {
    try {
      // The list has no rule id lists; read the full set, then write it back with the change.
      const { id, version, name, description, visibility, included_rule_ids, excluded_rule_ids } =
        await fetchRuleSet(group.id);
      await save({
        id,
        version,
        name,
        description,
        visibility,
        conditions,
        included_rule_ids,
        excluded_rule_ids,
      });
      addSuccess(i18n.SAVED_TOAST(group.name));
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
          onClick={() => setFilterOptions(ruleSetFilterState(group))}
          data-test-subj="ruleSetsResetFilters"
        >
          {i18n.RESET_FILTERS}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SaveAsRuleSetButton
          label={i18n.SAVE_AS_NEW_SET}
          hint={i18n.HINT_FILTERS(pagination.total)}
          getRules={async () => {
            const full = await fetchRuleSet(group.id);
            return {
              conditions,
              included_rule_ids: full.included_rule_ids,
              excluded_rule_ids: full.excluded_rule_ids,
            };
          }}
          dataTestSubj="ruleSetsSaveAsNewGroup"
        />
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
  // In a set the facets are the set's conditions: the bar shows only an unsaved change.
  const hasFilters = ruleSetId
    ? isRuleSetChanged(filterOptions, group)
    : Object.keys(filtersToGroupConditions(filterOptions)).length > 0;

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
