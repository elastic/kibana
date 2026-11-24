/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import useMount from 'react-use/lib/useMount';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  PreviewRuleGroupResponse,
  RuleGroup,
  RuleGroupConditions,
  RuleGroupDefinition,
} from '../../../../common/api/detection_engine/rule_groups';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useIntegrations } from '../../common/components/related_integrations/use_integrations';
import { useFetchRuleManagementFiltersQuery } from '../../rule_management/api/hooks/use_fetch_rule_management_filters_query';
import { fetchSearchRules } from '../../rule_management/api/api';
import { useRuleGroupPreviewQuery, useSaveRuleGroupMutation } from '../api';
import type { PickedRule } from './rule_picker_modal';
import { RulePickerModal } from './rule_picker_modal';
import { RuleConditionsFilterBar } from './rule_conditions_filter_bar';
import * as i18n from './translations';

const LIST_PREVIEW = 4;
const NAMES_TO_FETCH = 50;

type PreviewRule = PreviewRuleGroupResponse['rules'][number];

const REASON_BADGE: Record<PreviewRule['reason'], React.ReactNode> = {
  conditions: (
    <EuiBadge color="hollow" iconType="filter">
      {i18n.WHY_CONDITIONS}
    </EuiBadge>
  ),
  picked: (
    <EuiBadge color="primary" iconType="pin">
      {i18n.WHY_PICKED}
    </EuiBadge>
  ),
  both: (
    <EuiBadge color="primary" iconType="pin">
      {i18n.WHY_BOTH}
    </EuiBadge>
  ),
};

const RuleList = ({
  ruleIds,
  names,
  empty,
  onRemove,
}: {
  ruleIds: string[];
  names: Map<string, string>;
  empty: string;
  onRemove: (ruleId: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!ruleIds.length) {
    return (
      <EuiText size="xs" color="subdued">
        {empty}
      </EuiText>
    );
  }
  const shown = isExpanded ? ruleIds.slice(0, NAMES_TO_FETCH) : ruleIds.slice(0, LIST_PREVIEW);
  return (
    <>
      {shown.map((ruleId) => (
        <EuiFlexGroup key={ruleId} gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem css={{ minWidth: 0 }}>
            <EuiText size="xs" className="eui-textTruncate">
              {names.get(ruleId) ?? ruleId}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={names.get(ruleId) ?? ruleId} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                size="xs"
                color="text"
                aria-label={names.get(ruleId) ?? ruleId}
                onClick={() => onRemove(ruleId)}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
      {ruleIds.length > LIST_PREVIEW && (
        <EuiButtonEmpty size="xs" flush="left" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? i18n.SHOW_LESS : i18n.SHOW_MORE(ruleIds.length - LIST_PREVIEW)}
        </EuiButtonEmpty>
      )}
    </>
  );
};

const Step = ({
  n,
  title,
  help,
  action,
  children,
}: {
  n: number;
  title: string;
  help: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <EuiPanel hasBorder paddingSize="m">
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{n}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {action && <EuiFlexItem grow={false}>{action}</EuiFlexItem>}
    </EuiFlexGroup>
    <EuiText size="xs" color="subdued">
      <p>{help}</p>
    </EuiText>
    <EuiSpacer size="s" />
    {children}
  </EuiPanel>
);

/** KQL for the rule picker of step 3: only rules that the conditions match can be left out. */
const conditionsToKql = (conditions: RuleGroupConditions): string | undefined => {
  const quote = (value: string) => `"${value.replace(/["\\]/g, '\\$&')}"`;
  const any = (field: string, values?: string[]) =>
    values?.length ? `${field}: (${values.map(quote).join(' OR ')})` : undefined;
  const parts = [
    conditions.tags?.length
      ? conditions.tags.map((tag) => `alert.attributes.tags: ${quote(tag)}`).join(' AND ')
      : undefined,
    any('alert.attributes.params.relatedIntegrations.package', conditions.integrations),
    any('alert.attributes.params.type', conditions.rule_types),
    any('alert.attributes.params.severity', conditions.severities),
    conditions.source
      ? `alert.attributes.params.immutable: ${conditions.source === 'elastic'}`
      : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(' AND ') : undefined;
};

interface RuleGroupEditorFlyoutProps {
  group?: RuleGroup;
  initial?: Partial<RuleGroupDefinition>;
  onClose: () => void;
  onSaved: (group: RuleGroup) => void;
}

/** One place to create or change a rule group: conditions, picked rules, left-out rules, live preview. */
export const RuleGroupEditorFlyout = ({
  group,
  initial,
  onClose,
  onSaved,
}: RuleGroupEditorFlyoutProps) => {
  const start = group ?? initial ?? {};
  const [name, setName] = useState(start.name ?? '');
  const [description, setDescription] = useState(start.description ?? '');
  const [visibility, setVisibility] = useState<RuleGroupDefinition['visibility']>(
    start.visibility ?? 'space'
  );
  const [conditions, setConditions] = useState<RuleGroupConditions>(start.conditions ?? {});
  const [included, setIncluded] = useState<string[]>(start.included_rule_ids ?? []);
  const [excluded, setExcluded] = useState<string[]>(start.excluded_rule_ids ?? []);
  const titleId = useGeneratedHtmlId();
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [picker, setPicker] = useState<'include' | 'exclude' | null>(null);
  const [debounced, setDebounced] = useState({ conditions, included, excluded });
  const [page, setPage] = useState(0);

  useDebounce(
    () => {
      setDebounced({ conditions, included, excluded });
      // A new definition can have fewer pages than the current page index.
      setPage(0);
    },
    300,
    [conditions, included, excluded]
  );

  // Show names for the first picked and left-out rules of an existing group.
  useMount(() => {
    const ruleIds = [
      ...(start.included_rule_ids ?? []).slice(0, NAMES_TO_FETCH),
      ...(start.excluded_rule_ids ?? []).slice(0, NAMES_TO_FETCH),
    ];
    if (!ruleIds.length) return;
    fetchSearchRules({
      filter: {
        term: `alert.attributes.params.ruleId: (${ruleIds.map((id) => `"${id}"`).join(' OR ')})`,
        mode: 'KQL',
      },
      pagination: { page: 1, perPage: ruleIds.length },
      fields: ['name', 'rule_id'],
    })
      .then(({ data }) =>
        setNames(
          (current) =>
            new Map([...current, ...data.map((rule) => [rule.rule_id, rule.name] as const)])
        )
      )
      .catch(() => {});
  });

  const { data: filters } = useFetchRuleManagementFiltersQuery();
  const { data: integrations } = useIntegrations();
  const integrationOptions = useMemo(
    () =>
      (integrations ?? []).map((integration) => ({
        value: integration.package_name,
        label: integration.package_title,
      })),
    [integrations]
  );

  const { data: preview, isFetching } = useRuleGroupPreviewQuery({
    conditions: debounced.conditions,
    included_rule_ids: debounced.included,
    excluded_rule_ids: debounced.excluded,
    page: page + 1,
    per_page: 12,
  });

  const { mutateAsync: save, isLoading: isSaving } = useSaveRuleGroupMutation();
  const { addSuccess, addError } = useAppToasts();
  const onSave = async () => {
    try {
      const saved = await save({
        id: group?.id,
        version: group?.version,
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        visibility,
        conditions,
        included_rule_ids: included,
        excluded_rule_ids: excluded,
      });
      addSuccess(i18n.SAVED_TOAST(saved.name));
      onSaved(saved);
      onClose();
    } catch (error) {
      addError(error, { title: i18n.SAVE_ERROR });
    }
  };

  const setCondition = <K extends keyof RuleGroupConditions>(
    key: K,
    value: RuleGroupConditions[K]
  ) =>
    setConditions((current) => {
      const next = { ...current, [key]: value };
      if (value == null || value === '') delete next[key];
      return next;
    });

  const rememberNames = (rules: PickedRule[]) =>
    setNames(
      (current) => new Map([...current, ...rules.map((rule) => [rule.rule_id, rule.name] as const)])
    );

  const columns: Array<EuiBasicTableColumn<PreviewRule>> = [
    { field: 'name', name: i18n.COLUMN_RULE, truncateText: true, width: '52%' },
    {
      field: 'reason',
      name: i18n.WHY,
      render: (reason: PreviewRule['reason']) => REASON_BADGE[reason],
    },
    {
      field: 'type',
      name: i18n.COLUMN_TYPE,
      render: (type: string) => i18n.RULE_TYPE_LABELS[type] ?? type,
    },
    {
      field: 'severity',
      name: i18n.COLUMN_SEVERITY,
      render: (severity: string) => i18n.SEVERITY_LABELS[severity] ?? severity,
    },
  ];
  const total = preview?.total ?? 0;
  const conditionsKql = conditionsToKql(conditions);

  return (
    <EuiFlyout
      aria-labelledby={titleId}
      onClose={onClose}
      size={1200}
      ownFocus
      data-test-subj="ruleGroupEditorFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {group ? i18n.EDITOR_EDIT_TITLE(group.name) : i18n.EDITOR_CREATE_TITLE}
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.EDITOR_SUBTITLE}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false} css={{ width: 460 }}>
            <EuiFormRow label={i18n.NAME} fullWidth>
              <EuiFieldText
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-test-subj="ruleGroupEditorName"
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.DESCRIPTION}
              fullWidth
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {i18n.OPTIONAL}
                </EuiText>
              }
            >
              <EuiTextArea
                fullWidth
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.VISIBILITY} fullWidth>
              <EuiButtonGroup
                legend={i18n.VISIBILITY}
                isFullWidth
                buttonSize="compressed"
                idSelected={visibility}
                onChange={(id) => setVisibility(id as RuleGroupDefinition['visibility'])}
                isDisabled={group != null && !group.is_owner}
                options={[
                  { id: 'space', label: i18n.VISIBILITY_SPACE },
                  { id: 'private', label: i18n.VISIBILITY_PRIVATE },
                ]}
              />
            </EuiFormRow>
            <EuiHorizontalRule margin="m" />
            <EuiTitle size="xs">
              <h3>{i18n.WHICH_RULES}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            <Step n={1} title={i18n.STEP_CONDITIONS} help={i18n.STEP_CONDITIONS_HELP}>
              <RuleConditionsFilterBar
                conditions={conditions}
                onChange={setCondition}
                tags={filters?.aggregated_fields.tags ?? []}
                integrations={integrationOptions}
              />
            </Step>
            <EuiSpacer size="s" />

            <Step
              n={2}
              title={i18n.STEP_PICKED(included.length)}
              help={i18n.STEP_PICKED_HELP}
              action={
                <EuiButton
                  size="s"
                  iconType="plus"
                  onClick={() => setPicker('include')}
                  data-test-subj="ruleGroupEditorPickRules"
                >
                  {i18n.PICK_RULES}
                </EuiButton>
              }
            >
              <RuleList
                ruleIds={included}
                names={names}
                empty={i18n.NO_RULES_PICKED}
                onRemove={(ruleId) => setIncluded(included.filter((id) => id !== ruleId))}
              />
            </Step>
            <EuiSpacer size="s" />

            <Step
              n={3}
              title={i18n.STEP_LEFT_OUT(excluded.length)}
              help={i18n.STEP_LEFT_OUT_HELP}
              action={
                <EuiButtonEmpty
                  size="s"
                  iconType="minus"
                  onClick={() => setPicker('exclude')}
                  isDisabled={!conditionsKql}
                >
                  {i18n.PICK_RULES}
                </EuiButtonEmpty>
              }
            >
              <RuleList
                ruleIds={excluded}
                names={names}
                empty={i18n.NO_RULES_LEFT_OUT}
                onRemove={(ruleId) => setExcluded(excluded.filter((id) => id !== ruleId))}
              />
            </Step>
          </EuiFlexItem>

          <EuiFlexItem css={{ minWidth: 0 }}>
            <EuiPanel color="subdued" paddingSize="m">
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.PREVIEW}
                  </EuiText>
                  <EuiTitle size="m">
                    <span data-test-subj="ruleGroupEditorPreviewTotal">
                      {i18n.PREVIEW_RULES(total)}
                    </span>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    {i18n.PREVIEW_BREAKDOWN(
                      preview?.by_conditions ?? 0,
                      preview?.only_picked ?? 0,
                      excluded.length
                    )}
                  </EuiText>
                </EuiFlexItem>
                {group && total !== group.rules_count && group.rules_count != null && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={total > group.rules_count ? 'success' : 'danger'}>
                      {i18n.PREVIEW_DIFF(total - group.rules_count)}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="s" />
            {total === 0 && !isFetching ? (
              <EuiPanel hasBorder paddingSize="xl">
                <EuiText textAlign="center" color="subdued">
                  <p>{i18n.PREVIEW_EMPTY}</p>
                </EuiText>
              </EuiPanel>
            ) : (
              <EuiBasicTable<PreviewRule>
                tableCaption={i18n.PREVIEW}
                compressed
                tableLayout="fixed"
                loading={isFetching}
                items={preview?.rules ?? []}
                columns={columns}
                pagination={{
                  pageIndex: page,
                  pageSize: 12,
                  totalItemCount: total,
                  showPerPageOptions: false,
                }}
                onChange={({ page: next }: Criteria<PreviewRule>) => next && setPage(next.index)}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{i18n.CANCEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onSave}
              isLoading={isSaving}
              isDisabled={!name.trim() || total === 0}
              data-test-subj="ruleGroupEditorSave"
            >
              {group ? i18n.SAVE_CHANGES : i18n.CREATE_GROUP(total)}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
      {picker && (
        <RulePickerModal
          title={picker === 'include' ? i18n.PICKER_TITLE_INCLUDE : i18n.PICKER_TITLE_EXCLUDE}
          initial={(picker === 'include' ? included : excluded).map((ruleId) => ({
            rule_id: ruleId,
            name: names.get(ruleId) ?? ruleId,
          }))}
          filter={picker === 'exclude' ? conditionsKql : undefined}
          onClose={() => setPicker(null)}
          onConfirm={(rules) => {
            rememberNames(rules);
            const ruleIds = rules.map((rule) => rule.rule_id);
            if (picker === 'include') setIncluded(ruleIds);
            else setExcluded(ruleIds);
          }}
        />
      )}
    </EuiFlyout>
  );
};
