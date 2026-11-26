/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent, PropsWithChildren, ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DefaultItemAction, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { get } from 'lodash';
import { useQuery } from '@kbn/react-query';
import { SecurityPageName } from '../../../../../common/constants';
import {
  getEditRuleUrl,
  getRuleDetailsTabUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import {
  SecuritySolutionLinkAnchor,
  SecuritySolutionLinkButton,
} from '../../../../common/components/links';
import { useSecuritySolutionLinkProps } from '../../../../common/components/links/link_props';
import {
  useGetInitialUrlParamValue,
  useReplaceUrlParams,
} from '../../../../common/utils/global_query_string/helpers';
import { fetchQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/api';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details/use_rule_details_tabs';
import { RuleDetailsFlyout } from '../../../rule_management/components/rule_details/rule_details_flyout';
import type { Rule } from '../../../rule_management/logic';
import { useRule } from '../../../rule_management/logic/use_rule';
import { RULE_TYPE_LABELS } from '../../../rule_sets/components/translations';
import * as i18n from '../../../rule_sets/search/translations';
import { useRuleSearchStatus } from '../../../rule_sets/search/use_rule_search_status';
import { useRulesTableContext } from './rules_table/rules_table_context';

/** The open rule, by id, so that a link opens the same flyout. */
const URL_PARAM = 'ruleFlyout';
/** Fields of the table columns that the flyout header shows, in this order. */
const HEADER_FIELDS = [
  'severity',
  'risk_score',
  'execution_summary.last_execution.status',
  'execution_summary.last_execution.date',
  'enabled',
];

interface RuleFlyoutApi {
  openRule: (rule: Rule) => void;
  /** Why each rule matched a search by meaning, by rule id. */
  snippets: Record<string, string>;
}

const RuleFlyoutContext = createContext<RuleFlyoutApi | undefined>(undefined);

const isNewTabClick = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const useAlertsLast7Days = (ruleId: string) =>
  useQuery(
    ['ruleFlyoutAlerts7d', ruleId],
    async ({ signal }) => {
      const response = await fetchQueryAlerts<unknown, unknown>({
        query: {
          size: 0,
          track_total_hits: true,
          query: {
            bool: {
              filter: [
                { term: { 'kibana.alert.rule.uuid': ruleId } },
                { range: { '@timestamp': { gte: 'now-7d' } } },
              ],
            },
          },
        },
        signal: signal ?? new AbortController().signal,
      });
      return response.hits.total.value;
    },
    { refetchOnWindowFocus: false }
  );

const WhyItMatched = ({ snippet }: { snippet: string }) => (
  <EuiPanel color="subdued" paddingSize="s" hasShadow={false} data-test-subj="ruleFlyoutWhyMatched">
    <EuiTitle size="xxxs">
      <h4>{i18n.WHY_IT_MATCHED}</h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s">{snippet}</EuiText>
  </EuiPanel>
);

const RuleFlyoutHeader = ({
  rule,
  columns,
  position,
  onPrevious,
  onNext,
  snippet,
}: {
  rule: Rule;
  columns: Array<EuiBasicTableColumn<Rule>>;
  position?: { index: number; total: number };
  onPrevious?: () => void;
  onNext?: () => void;
  snippet?: string;
}) => {
  const { data: alerts } = useAlertsLast7Days(rule.id);
  const cells = HEADER_FIELDS.flatMap((field) => {
    const column = columns.find((c) => 'field' in c && c.field === field);
    if (!column || !('render' in column) || !column.render) return [];
    const render = column.render as (value: unknown, item: Rule) => ReactNode;
    return [{ field, name: column.name, value: render(get(rule, field), rule) }];
  });
  return (
    <>
      <EuiFlexGroup gutterSize="l" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.RULE_TYPE}
          </EuiText>
          <EuiBadge color="hollow">{RULE_TYPE_LABELS[rule.type] ?? rule.type}</EuiBadge>
        </EuiFlexItem>
        {cells.map(({ field, name, value }) => (
          <EuiFlexItem grow={false} key={field} data-test-subj={`ruleFlyoutHeader-${field}`}>
            <EuiText size="xs" color="subdued">
              {name}
            </EuiText>
            {value}
          </EuiFlexItem>
        ))}
        <EuiFlexItem />
        {position && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiText size="xs" color="subdued">
                {i18n.POSITION(position.index + 1, position.total)}
              </EuiText>
              <EuiToolTip content={i18n.PREVIOUS_RULE} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleUp"
                  aria-label={i18n.PREVIOUS_RULE}
                  isDisabled={!onPrevious}
                  onClick={onPrevious}
                  data-test-subj="ruleFlyoutPrevious"
                />
              </EuiToolTip>
              <EuiToolTip content={i18n.NEXT_RULE} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleDown"
                  aria-label={i18n.NEXT_RULE}
                  isDisabled={!onNext}
                  onClick={onNext}
                  data-test-subj="ruleFlyoutNext"
                />
              </EuiToolTip>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {alerts !== undefined && (
        <EuiText size="s" data-test-subj="ruleFlyoutAlerts">
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.rules}
            path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.alerts)}
          >
            {i18n.ALERTS_LAST_7_DAYS(alerts)}
          </SecuritySolutionLinkAnchor>
        </EuiText>
      )}
      {snippet && (
        <>
          <EuiSpacer size="s" />
          <WhyItMatched snippet={snippet} />
        </>
      )}
    </>
  );
};

const RuleFlyoutActions = ({
  rule,
  actions,
  onDone,
}: {
  rule: Rule;
  actions: Array<DefaultItemAction<Rule>>;
  onDone: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const searchStatus = useRuleSearchStatus();
  const {
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const items = actions.map((action, index) => {
    const enabled = action.enabled ? action.enabled(rule) : true;
    const label = typeof action.description === 'string' ? action.description : String(index);
    return (
      <EuiContextMenuItem
        key={label}
        icon={typeof action.icon === 'string' ? action.icon : undefined}
        disabled={!enabled}
        onClick={async () => {
          setIsOpen(false);
          await action.onClick?.(rule, {} as MouseEvent);
          onDone();
        }}
      >
        {typeof action.name === 'function' ? action.name(rule) : action.name}
      </EuiContextMenuItem>
    );
  });
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
      {searchStatus === 'ready' && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="sparkles"
            onClick={() => {
              setFilterOptions({
                similarTo: { id: rule.id, name: rule.name },
                filter: '',
                members: undefined,
              });
              onDone();
            }}
            data-test-subj="ruleFlyoutFindSimilar"
          >
            {i18n.FIND_SIMILAR}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.MORE_ACTIONS}
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          panelPaddingSize="none"
          anchorPosition="upCenter"
          button={
            <EuiButtonEmpty
              iconType="ellipsis"
              onClick={() => setIsOpen(!isOpen)}
              data-test-subj="ruleFlyoutMoreActions"
            >
              {i18n.MORE_ACTIONS}
            </EuiButtonEmpty>
          }
        >
          <EuiContextMenuPanel items={items} />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SecuritySolutionLinkButton
          deepLinkId={SecurityPageName.rules}
          path={getEditRuleUrl(rule.id)}
          iconType="pencil"
          data-test-subj="ruleFlyoutEdit"
        >
          {i18n.EDIT_RULE}
        </SecuritySolutionLinkButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SecuritySolutionLinkButton
          fill
          deepLinkId={SecurityPageName.rules}
          path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.overview)}
          data-test-subj="rulesTableRuleFlyoutOpenDetails"
        >
          {i18n.OPEN_RULE_DETAILS}
        </SecuritySolutionLinkButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * The rules table opens a rule in a flyout to read it without leaving the list: the state and
 * the actions of the rule, why it matched a search, and the next or previous rule of the page
 * (buttons, j/k). The full page is one click away; the open rule is in the URL.
 */
export const RuleFlyoutProvider = ({
  snippets,
  rules,
  columns,
  actions,
  children,
}: PropsWithChildren<{
  snippets: Record<string, string>;
  /** The rules of the page, for the next and the previous rule and fresh state. */
  rules: Rule[];
  /** The table columns: the header shows the same cells (severity, last response, enabled…). */
  columns: Array<EuiBasicTableColumn<Rule>>;
  /** The actions of a table row (edit, duplicate, export, delete…). */
  actions: Array<DefaultItemAction<Rule>>;
}>) => {
  const replaceUrlParams = useReplaceUrlParams();
  const getInitialUrlParam = useGetInitialUrlParamValue<string>(URL_PARAM);
  const [openedId, setOpenedId] = useState<string | undefined>(
    () => getInitialUrlParam() ?? undefined
  );
  const [opened, setOpened] = useState<Rule>();
  const inTable = rules.find(({ id }) => id === openedId);
  // A link may open a rule that is not on this page.
  const { data: fetched } = useRule(openedId ?? '', false, {
    enabled: Boolean(openedId) && !inTable && opened?.id !== openedId,
  });
  const rule = inTable ?? (opened?.id === openedId ? opened : undefined) ?? fetched;

  const open = useCallback(
    (next: Rule) => {
      setOpened(next);
      setOpenedId(next.id);
      replaceUrlParams({ [URL_PARAM]: next.id });
    },
    [replaceUrlParams]
  );
  const close = useCallback(() => {
    setOpened(undefined);
    setOpenedId(undefined);
    replaceUrlParams({ [URL_PARAM]: null });
  }, [replaceUrlParams]);

  const index = rule ? rules.findIndex(({ id }) => id === rule.id) : -1;
  const previous = index > 0 ? () => open(rules[index - 1]) : undefined;
  const next = index >= 0 && index < rules.length - 1 ? () => open(rules[index + 1]) : undefined;

  useEffect(() => {
    if (index < 0) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const to = event.key === 'j' ? index + 1 : event.key === 'k' ? index - 1 : -1;
      if (to >= 0 && to < rules.length) open(rules[to]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, rules, open]);

  const api = useMemo(() => ({ openRule: open, snippets }), [open, snippets]);
  return (
    <RuleFlyoutContext.Provider value={api}>
      {children}
      {rule && (
        <RuleDetailsFlyout
          rule={rule}
          size="l"
          resizable
          id="rulesTableRuleFlyout"
          dataTestSubj="rulesTableRuleFlyout"
          closeFlyout={close}
          subHeader={
            <RuleFlyoutHeader
              rule={rule}
              columns={columns}
              position={index >= 0 ? { index, total: rules.length } : undefined}
              onPrevious={previous}
              onNext={next}
              snippet={snippets[rule.id]}
            />
          }
          ruleActions={<RuleFlyoutActions rule={rule} actions={actions} onDone={close} />}
        />
      )}
    </RuleFlyoutContext.Provider>
  );
};

/**
 * The rule name in the rules table: opens the flyout, keeps the link to the rule page for a new
 * tab, and shows why the rule matched a search by meaning. Outside the rules table, a plain link.
 */
export const RuleNameCell = ({ rule }: { rule: Rule }) => {
  const flyout = useContext(RuleFlyoutContext);
  const { href } = useSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.rules,
    path: getRuleDetailsTabUrl(rule.id, RuleDetailTabs.overview),
  });
  const openRule = flyout?.openRule;
  const onClick = useCallback(
    (event: MouseEvent) => {
      if (!openRule || isNewTabClick(event)) return;
      event.preventDefault();
      openRule(rule);
    },
    [openRule, rule]
  );
  if (!flyout) {
    return (
      <EuiToolTip content={rule.name} anchorClassName="eui-textTruncate">
        <SecuritySolutionLinkAnchor
          data-test-subj="ruleName"
          deepLinkId={SecurityPageName.rules}
          path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.overview)}
        >
          {rule.name}
        </SecuritySolutionLinkAnchor>
      </EuiToolTip>
    );
  }
  const snippet = flyout.snippets[rule.id];
  return (
    <div className="eui-textTruncate">
      <EuiToolTip content={rule.name} anchorClassName="eui-textTruncate">
        <EuiLink href={href} onClick={onClick} data-test-subj="ruleName">
          {rule.name}
        </EuiLink>
      </EuiToolTip>
      {snippet && (
        <EuiText
          size="xs"
          color="subdued"
          className="eui-textTruncate"
          title={snippet}
          data-test-subj="ruleSearchSnippet"
        >
          {snippet}
        </EuiText>
      )}
    </div>
  );
};
