/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import { SloStateBadge } from '../../../../components/slo/slo_badges';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_badges/slo_active_alerts_badge';
import { SloTagsBadge } from '../../../../components/slo/slo_badges/slo_tags_badge';
import { BurnRateRuleParams } from '../../../../typings';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { LoadingBadges } from '../badges/slo_badges';
import { SloRemoteBadge } from '../badges/slo_remote_badge';
import { SloRulesBadge } from '../badges/slo_rules_badge';
import { SLOCardItemInstanceBadge } from './slo_card_item_instance_badge';

interface Props {
  activeAlerts?: number;
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<BurnRateRuleParams>> | undefined;
  handleCreateRule?: () => void;
}

export function SloCardItemBadges({ slo, activeAlerts, rules, handleCreateRule }: Props) {
  const { onStateChange } = useUrlSearchState();

  const handleTagClick = (tag: string) =>
    onStateChange({
      kqlQuery: `slo.tags: "${tag}"`,
    });

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
            <SloStateBadge slo={slo} />
            <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlerts} viewMode="compact" />
            <SLOCardItemInstanceBadge slo={slo} />
            <SloRulesBadge rules={rules} onClick={handleCreateRule} isRemote={!!slo.remote} />
            <SloRemoteBadge slo={slo} />
            <SloTagsBadge slo={slo} onClick={handleTagClick} defaultVisibleTags={1} />
          </>
        )}
      </EuiFlexGroup>
    </div>
  );
}
