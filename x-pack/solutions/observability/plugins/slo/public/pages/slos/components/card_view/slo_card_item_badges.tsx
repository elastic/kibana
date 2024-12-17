/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { SloIndicatorTypeBadge } from '../badges/slo_indicator_type_badge';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { BurnRateRuleParams } from '../../../../typings';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { LoadingBadges } from '../badges/slo_badges';
import { SloRemoteBadge } from '../badges/slo_remote_badge';
import { SloRulesBadge } from '../badges/slo_rules_badge';
import { SloTimeWindowBadge } from '../badges/slo_time_window_badge';
import { SloTagsList } from '../common/slo_tags_list';
import { SLOCardItemInstanceBadge } from './slo_card_item_instance_badge';

interface Props {
  hasGroupBy: boolean;
  activeAlerts?: number;
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<BurnRateRuleParams>> | undefined;
  handleCreateRule?: () => void;
}

export function SloCardItemBadges({ slo, activeAlerts, rules, handleCreateRule }: Props) {
  const { onStateChange } = useUrlSearchState();

  const onTagClick = useCallback(
    (tag: string) => {
      onStateChange({
        kqlQuery: `slo.tags: "${tag}"`,
      });
    },
    [onStateChange]
  );

  const isRemote = !!slo.remote;

  // in this case, there is more space to display tags
  const numberOfTagsToDisplay = !isRemote || (rules ?? []).length > 0 ? 2 : 1;

  return (
    <div
      css={({ euiTheme }) => css`
        display: inline-block;
        margin-top: ${euiTheme.size.xs};
      `}
      onClick={(evt) => {
        evt.stopPropagation();
      }}
      aria-hidden="true"
    >
      <EuiFlexGroup direction="row" responsive={false} gutterSize="xs" alignItems="center" wrap>
        {!slo.summary ? (
          <LoadingBadges />
        ) : (
          <>
            <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlerts} viewMode="compact" />
            <SloIndicatorTypeBadge slo={slo} color="default" />
            <SLOCardItemInstanceBadge slo={slo} />
            <SloRulesBadge rules={rules} onClick={handleCreateRule} isRemote={!!slo.remote} />
            <SloTimeWindowBadge slo={slo} color="default" />
            <SloRemoteBadge slo={slo} />
            <SloTagsList
              tags={slo.tags}
              numberOfTagsToDisplay={numberOfTagsToDisplay}
              color="default"
              ignoreEmpty
              onClick={onTagClick}
            />
          </>
        )}
      </EuiFlexGroup>
    </div>
  );
}
