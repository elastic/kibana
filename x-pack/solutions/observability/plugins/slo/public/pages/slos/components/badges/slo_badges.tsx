/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSkeletonRectangle } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import { SloStateBadge, SloStatusBadge } from '../../../../components/slo/slo_badges';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_badges/slo_active_alerts_badge';
import { SloTagsBadge } from '../../../../components/slo/slo_badges/slo_tags_badge';
import { BurnRateRuleParams } from '../../../../typings';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { SloIndicatorTypeBadge } from './slo_indicator_type_badge';
import { SloRemoteBadge } from './slo_remote_badge';
import { SloRulesBadge } from './slo_rules_badge';
import { SloTimeWindowBadge } from './slo_time_window_badge';

export type ViewMode = 'default' | 'compact';

export interface SloBadgesProps {
  activeAlerts?: number;
  isLoading: boolean;
  rules: Array<Rule<BurnRateRuleParams>> | undefined;
  slo: SLOWithSummaryResponse;
  onClickRuleBadge: () => void;
}

export function SloBadges({
  activeAlerts,
  isLoading,
  rules,
  slo,
  onClickRuleBadge,
}: SloBadgesProps) {
  const { onStateChange } = useUrlSearchState();

  const handleTagClick = (tag: string) => {
    onStateChange({
      kqlQuery: `slo.tags: "${tag}"`,
    });
  };

  return (
    <EuiFlexGroup direction="row" responsive gutterSize="s" alignItems="center" wrap>
      {isLoading ? (
        <LoadingBadges />
      ) : (
        <>
          <SloStatusBadge slo={slo} />
          <SloStateBadge slo={slo} />
          <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlerts} />
          <SloIndicatorTypeBadge slo={slo} />
          <SloTimeWindowBadge slo={slo} />
          <SloRemoteBadge slo={slo} />
          <SloRulesBadge rules={rules} onClick={onClickRuleBadge} isRemote={!!slo.remote} />
          <SloTagsBadge slo={slo} onClick={handleTagClick} />
        </>
      )}
    </EuiFlexGroup>
  );
}

export function LoadingBadges() {
  return (
    <>
      <EuiSkeletonRectangle
        isLoading
        contentAriaLabel="Loading"
        width="54.16px"
        height="20px"
        borderRadius="s"
      />
      <EuiSkeletonRectangle
        isLoading
        contentAriaLabel="Loading"
        width="54.16px"
        height="20px"
        borderRadius="s"
      />
      <EuiSkeletonRectangle
        isLoading
        contentAriaLabel="Loading"
        width="54.16px"
        height="20px"
        borderRadius="s"
      />
    </>
  );
}
