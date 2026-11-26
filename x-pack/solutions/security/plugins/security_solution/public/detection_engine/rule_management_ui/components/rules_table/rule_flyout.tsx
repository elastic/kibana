/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent, PropsWithChildren, ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { DefaultItemAction, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
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
import type { SearchHighlight } from '../../../rule_management/api/hooks/use_find_rules_query';
import type { Rule } from '../../../rule_management/logic';
import { useRule } from '../../../rule_management/logic/use_rule';
import { RULE_TYPE_LABELS } from '../../../rule_sets/components/translations';
import * as i18n from '../../../rule_sets/search/translations';

/** The open rule, by id, so that a link opens the same flyout. */
const URL_PARAM = 'ruleFlyout';
/** Room for the close button of the flyout at the right end of the top bar. */
const CLOSE_BUTTON_SPACE = 32;

type Columns = Array<EuiBasicTableColumn<Rule>>;

interface RuleFlyoutApi {
  openRule: (rule: Rule) => void;
  /** Why each rule matched a search by meaning, by rule id. */
  snippets: Record<string, SearchHighlight>;
}

const RuleFlyoutContext = createContext<RuleFlyoutApi | undefined>(undefined);

const isNewTabClick = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/** The cell of a table column for the rule, e.g. the enabled switch with its permission checks. */
const cellOf = (columns: Columns, rule: Rule, field: string): ReactNode => {
  const column = columns.find((c) => 'field' in c && c.field === field);
  if (!column || !('render' in column) || !column.render) return null;
  const render = column.render as (value: unknown, item: Rule) => ReactNode;
  return render(get(rule, field), rule);
};

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

const Dot = () => (
  <EuiText size="s" color="subdued" aria-hidden>
    {'·'}
  </EuiText>
);

/** One line of facts under the title, without labels, and the enabled switch at the end. */
const RuleFacts = ({ rule, columns }: { rule: Rule; columns: Columns }) => {
  const { data: alerts } = useAlertsLast7Days(rule.id);
  const lastRun = rule.execution_summary?.last_execution;
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{RULE_TYPE_LABELS[rule.type] ?? rule.type}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{cellOf(columns, rule, 'severity')}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{i18n.RISK(rule.risk_score)}</EuiText>
      </EuiFlexItem>
      <Dot />
      <EuiFlexItem grow={false}>
        {lastRun ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            {cellOf(columns, rule, 'execution_summary.last_execution.status')}
            <EuiText size="s" color="subdued">
              {cellOf(columns, rule, 'execution_summary.last_execution.date')}
            </EuiText>
          </EuiFlexGroup>
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.NEVER_RUN}
          </EuiText>
        )}
      </EuiFlexItem>
      {alerts !== undefined && (
        <>
          <Dot />
          <EuiFlexItem grow={false}>
            <EuiText size="s" data-test-subj="ruleFlyoutAlerts">
              <SecuritySolutionLinkAnchor
                deepLinkId={SecurityPageName.rules}
                path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.alerts)}
              >
                {i18n.ALERTS_LAST_7_DAYS(alerts)}
              </SecuritySolutionLinkAnchor>
            </EuiText>
          </EuiFlexItem>
        </>
      )}
      <EuiFlexItem />
      <EuiFlexItem grow={false} data-test-subj="ruleFlyoutEnabled">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {cellOf(columns, rule, 'enabled')}
          <EuiText size="s">{i18n.ENABLED}</EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/** Why the rule matched the search, as a quiet quote that names its source. */
const WhyItMatched = ({ snippet }: { snippet: SearchHighlight }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        borderLeft: `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderBasePlain}`,
        paddingLeft: euiTheme.size.m,
      }}
      data-test-subj="ruleFlyoutWhyMatched"
    >
      <EuiText size="s">
        <em>{`“${snippet.text}”`}</em>
      </EuiText>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiIcon type="sparkles" size="s" color="subdued" aria-hidden />
        <EuiText size="xs" color="subdued">
          {i18n.WHY_IT_MATCHED_FROM(i18n.SNIPPET_SOURCE[snippet.source] ?? snippet.source)}
        </EuiText>
      </EuiFlexGroup>
    </div>
  );
};

/**
 * The bar above the title: the position in the results with previous and next on the left; the
 * actions on the right, with "Open rule details" the only filled button.
 */
const RuleFlyoutTopBar = ({
  rule,
  actions,
  position,
  onPrevious,
  onNext,
  onDone,
}: {
  rule: Rule;
  actions: Array<DefaultItemAction<Rule>>;
  position?: { index: number; total: number };
  onPrevious?: () => void;
  onNext?: () => void;
  onDone: () => void;
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { href: editHref } = useSecuritySolutionLinkProps({
    deepLinkId: SecurityPageName.rules,
    path: getEditRuleUrl(rule.id),
  });
  const menuItems = actions.map((action, index) => (
    <EuiContextMenuItem
      key={typeof action.description === 'string' ? action.description : String(index)}
      icon={typeof action.icon === 'string' ? action.icon : undefined}
      disabled={action.enabled ? !action.enabled(rule) : false}
      onClick={async () => {
        setIsMenuOpen(false);
        await action.onClick?.(rule, {} as MouseEvent);
        onDone();
      }}
    >
      {typeof action.name === 'function' ? action.name(rule) : action.name}
    </EuiContextMenuItem>
  ));

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      style={{ paddingRight: CLOSE_BUTTON_SPACE }}
    >
      {position && (
        <>
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
          <EuiText size="xs" color="subdued">
            {i18n.POSITION(position.index + 1, position.total)}
          </EuiText>
        </>
      )}
      <EuiFlexItem />
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.EDIT_RULE} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="pencil"
            href={editHref}
            aria-label={i18n.EDIT_RULE}
            data-test-subj="ruleFlyoutEdit"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.MORE_ACTIONS}
          isOpen={isMenuOpen}
          closePopover={() => setIsMenuOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downRight"
          button={
            <EuiToolTip content={i18n.MORE_ACTIONS} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="ellipsis"
                aria-label={i18n.MORE_ACTIONS}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                data-test-subj="ruleFlyoutMoreActions"
              />
            </EuiToolTip>
          }
        >
          <EuiContextMenuPanel items={menuItems} />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SecuritySolutionLinkButton
          fill
          size="s"
          iconType="external"
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
 * The rules table opens a rule in a flyout to read it without leaving the list (a "peek"): the
 * state of the rule in one line, why it matched a search, the next or previous rule of the page
 * and its actions. The full page is one click away; the open rule is in the URL.
 */
export const RuleFlyoutProvider = ({
  snippets,
  rules,
  columns,
  actions,
  children,
}: PropsWithChildren<{
  snippets: Record<string, SearchHighlight>;
  /** The rules of the page, for the next and the previous rule and fresh state. */
  rules: Rule[];
  /** The table columns: the flyout shows the same cells (severity, last response, enabled…). */
  columns: Columns;
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

  const api = useMemo(() => ({ openRule: open, snippets }), [open, snippets]);
  const snippet = rule ? snippets[rule.id] : undefined;
  return (
    <RuleFlyoutContext.Provider value={api}>
      {children}
      {rule && (
        <RuleDetailsFlyout
          rule={rule}
          size="m"
          resizable
          id="rulesTableRuleFlyout"
          dataTestSubj="rulesTableRuleFlyout"
          closeFlyout={close}
          hideFooter
          hideOverviewSeverityAndRisk
          overviewHighlight={snippet?.source === 'description' ? snippet.text : undefined}
          headerActions={
            <RuleFlyoutTopBar
              rule={rule}
              actions={actions}
              position={index >= 0 ? { index, total: rules.length } : undefined}
              onPrevious={previous}
              onNext={next}
              onDone={close}
            />
          }
          subHeader={
            <>
              <RuleFacts rule={rule} columns={columns} />
              {snippet && (
                <>
                  <EuiSpacer size="m" />
                  <WhyItMatched snippet={snippet} />
                </>
              )}
            </>
          }
        />
      )}
    </RuleFlyoutContext.Provider>
  );
};

/**
 * The rule name in the rules table: opens the flyout and keeps the link to the rule page for a
 * new tab. Outside the rules table, a plain link.
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
  return (
    <EuiToolTip content={rule.name} anchorClassName="eui-textTruncate">
      {flyout ? (
        <EuiLink href={href} onClick={onClick} data-test-subj="ruleName">
          {rule.name}
        </EuiLink>
      ) : (
        <SecuritySolutionLinkAnchor
          data-test-subj="ruleName"
          deepLinkId={SecurityPageName.rules}
          path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.overview)}
        >
          {rule.name}
        </SecuritySolutionLinkAnchor>
      )}
    </EuiToolTip>
  );
};
