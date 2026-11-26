/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent, PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { EuiLink, EuiPanel, EuiSpacer, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import { SecurityPageName } from '../../../../../common/constants';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import {
  SecuritySolutionLinkAnchor,
  SecuritySolutionLinkButton,
} from '../../../../common/components/links';
import { useSecuritySolutionLinkProps } from '../../../../common/components/links/link_props';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details/use_rule_details_tabs';
import { RuleDetailsFlyout } from '../../../rule_management/components/rule_details/rule_details_flyout';
import type { Rule } from '../../../rule_management/logic';
import * as i18n from '../../../rule_sets/search/translations';

interface RuleFlyoutApi {
  openRule: (rule: Rule) => void;
  /** Why each rule matched a search by meaning, by rule id. */
  snippets: Record<string, string>;
}

const RuleFlyoutContext = createContext<RuleFlyoutApi | undefined>(undefined);

const isNewTabClick = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const WhyItMatched = ({ snippet }: { snippet: string }) => (
  <EuiPanel color="subdued" paddingSize="s" hasShadow={false} data-test-subj="ruleFlyoutWhyMatched">
    <EuiTitle size="xxxs">
      <h4>{i18n.WHY_IT_MATCHED}</h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s">{snippet}</EuiText>
  </EuiPanel>
);

/**
 * The rules table opens a rule in a flyout to read it without leaving the list; the full page is
 * one click away (and a Cmd/Ctrl click on the name opens it in a new tab).
 */
export const RuleFlyoutProvider = ({
  snippets,
  children,
}: PropsWithChildren<{ snippets: Record<string, string> }>) => {
  const [rule, setRule] = useState<Rule>();
  const api = useMemo(() => ({ openRule: setRule, snippets }), [snippets]);
  const snippet = rule ? snippets[rule.id] : undefined;
  return (
    <RuleFlyoutContext.Provider value={api}>
      {children}
      {rule && (
        <RuleDetailsFlyout
          rule={rule}
          size="m"
          id="rulesTableRuleFlyout"
          dataTestSubj="rulesTableRuleFlyout"
          closeFlyout={() => setRule(undefined)}
          subHeader={snippet ? <WhyItMatched snippet={snippet} /> : undefined}
          ruleActions={
            <SecuritySolutionLinkButton
              fill
              deepLinkId={SecurityPageName.rules}
              path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.overview)}
              data-test-subj="rulesTableRuleFlyoutOpenDetails"
            >
              {i18n.OPEN_RULE_DETAILS}
            </SecuritySolutionLinkButton>
          }
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
