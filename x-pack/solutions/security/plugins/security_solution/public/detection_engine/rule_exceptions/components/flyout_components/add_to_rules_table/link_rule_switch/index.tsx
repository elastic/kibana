/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiFlexItem, EuiSwitch } from '@elastic/eui';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine';

export const LinkRuleSwitch = memo(
  ({
    rule,
    linkedRules,
    onRuleLinkChange,
  }: {
    rule: RuleResponse;
    linkedRules: RuleResponse[];
    onRuleLinkChange: (rulesSelectedToAdd: RuleResponse[]) => void;
  }) => {
    const isRuleLinked = useMemo(
      () => Boolean(linkedRules.find((r) => r.id === rule.id)),
      [linkedRules, rule.id]
    );
    const onLinkOrUnlinkRule = useCallback<EuiSwitchProps['onChange']>(
      ({ target: { checked } }) => {
        const newLinkedRules = !checked
          ? linkedRules?.filter((item) => item.id !== rule.id)
          : [...linkedRules, rule];
        if (typeof onRuleLinkChange === 'function') onRuleLinkChange(newLinkedRules);
      },
      [linkedRules, onRuleLinkChange, rule]
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiSwitch onChange={onLinkOrUnlinkRule} label="" checked={isRuleLinked} />
      </EuiFlexItem>
    );
  }
);

LinkRuleSwitch.displayName = 'LinkRuleSwitch';
