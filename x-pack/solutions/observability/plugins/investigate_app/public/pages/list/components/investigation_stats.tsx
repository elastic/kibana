/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetchAllInvestigationStats } from '../../../hooks/use_fetch_all_investigation_stats';
import { useKibana } from '../../../hooks/use_kibana';

export function InvestigationStats() {
  const {
    core: { uiSettings },
  } = useKibana();
  const { data, isLoading: isStatsLoading } = useFetchAllInvestigationStats();
  const numberFormat = uiSettings.get('format:number:defaultPattern');

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={numeral(data?.count.triage).format(numberFormat)}
            description={i18n.translate(
              'xpack.investigateApp.investigationList.stats.triageLabel',
              { defaultMessage: 'Triage' }
            )}
            titleSize="s"
            isLoading={isStatsLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={numeral(data?.count.active).format(numberFormat)}
            description={i18n.translate(
              'xpack.investigateApp.investigationList.stats.activeLabel',
              { defaultMessage: 'Active' }
            )}
            titleSize="s"
            isLoading={isStatsLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={numeral(data?.count.cancelled).format(numberFormat)}
            description={i18n.translate(
              'xpack.investigateApp.investigationList.stats.cancelledLabel',
              { defaultMessage: 'Cancelled' }
            )}
            titleSize="s"
            isLoading={isStatsLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={numeral(data?.count.mitigated).format(numberFormat)}
            description={i18n.translate(
              'xpack.investigateApp.investigationList.stats.mitigatedLabel',
              { defaultMessage: 'Mitigated' }
            )}
            titleSize="s"
            isLoading={isStatsLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={numeral(data?.count.resolved).format(numberFormat)}
            description={i18n.translate(
              'xpack.investigateApp.investigationList.stats.resolvedLabel',
              { defaultMessage: 'Resolved' }
            )}
            titleSize="s"
            isLoading={isStatsLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
