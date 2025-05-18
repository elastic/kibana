/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useState } from 'react';
import { BurnRateRuleParams } from '../../../../typings';
import { useSloListActions } from '../../hooks/use_slo_list_actions';
import { useSloFormattedSummary } from '../../hooks/use_slo_summary';
import { SloBadges } from '../badges/slo_badges';
import { BurnRateRuleFlyout } from '../common/burn_rate_rule_flyout';
import { EditBurnRateRuleFlyout } from '../common/edit_burn_rate_rule_flyout';
import { SLOGroupings } from '../common/slo_groupings';
import { SloItemActions } from '../slo_item_actions';
import { SloSummary } from '../slo_summary';

export interface SloListItemProps {
  slo: SLOWithSummaryResponse;
  rules?: Array<Rule<BurnRateRuleParams>>;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
  activeAlerts?: number;
  refetchRules: () => void;
}

export function SloListItem({
  slo,
  rules,
  refetchRules,
  historicalSummary = [],
  historicalSummaryLoading,
  activeAlerts,
}: SloListItemProps) {
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isAddRuleFlyoutOpen, setIsAddRuleFlyoutOpen] = useState(false);
  const [isEditRuleFlyoutOpen, setIsEditRuleFlyoutOpen] = useState(false);
  const { sloDetailsUrl } = useSloFormattedSummary(slo);
  const { handleCreateRule } = useSloListActions({
    slo,
    setIsActionsPopoverOpen,
    setIsAddRuleFlyoutOpen,
  });

  return (
    <EuiPanel data-test-subj="sloItem" hasBorder hasShadow={false}>
      <EuiFlexGroup responsive={false} alignItems="center">
        {/* CONTENT */}
        <EuiFlexItem grow>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <EuiText size="s">
                    <>
                      <a data-test-subj="o11ySloListItemLink" href={sloDetailsUrl}>
                        {slo.name}
                      </a>
                      <SLOGroupings slo={slo} />
                    </>
                  </EuiText>
                </EuiFlexItem>
                <SloBadges
                  activeAlerts={activeAlerts}
                  isLoading={!slo.summary}
                  rules={rules}
                  slo={slo}
                  onClickRuleBadge={handleCreateRule}
                />
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <SloSummary
                slo={slo}
                historicalSummary={historicalSummary}
                historicalSummaryLoading={historicalSummaryLoading}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* ACTIONS */}
        <EuiFlexItem grow={false}>
          <SloItemActions
            slo={slo}
            rules={rules}
            isActionsPopoverOpen={isActionsPopoverOpen}
            setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
            setIsEditRuleFlyoutOpen={setIsEditRuleFlyoutOpen}
            setIsActionsPopoverOpen={setIsActionsPopoverOpen}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <BurnRateRuleFlyout
        slo={slo}
        isAddRuleFlyoutOpen={isAddRuleFlyoutOpen}
        setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
      />

      <EditBurnRateRuleFlyout
        rule={rules?.[0]}
        isEditRuleFlyoutOpen={isEditRuleFlyoutOpen}
        setIsEditRuleFlyoutOpen={setIsEditRuleFlyoutOpen}
        refetchRules={refetchRules}
      />
    </EuiPanel>
  );
}
