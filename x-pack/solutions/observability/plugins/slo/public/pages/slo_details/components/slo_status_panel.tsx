/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import numeral from '@elastic/numeral';

import { useKibana } from '../../../hooks/use_kibana';
import { DefinitionItem } from './overview/definition_item';
import { Status } from '@kbn/slo-plugin/server/domain/models';
import { PanelColor } from '@elastic/eui/src/components/panel/panel';

export interface Props {
  slo?: SLOWithSummaryResponse;
  isLoading: boolean;
}

interface StatusHealth {
  displayText: string;
  badgeColor: PanelColor;
}

const displayStatus: Record<Status, StatusHealth> = {
  HEALTHY: {
    displayText: i18n.translate('xpack.slo.sloStatusBadge.healthy', {
      defaultMessage: 'Healthy',
    }),
    badgeColor: 'success',
  },

  DEGRADING: {
    displayText: i18n.translate('xpack.slo.sloStatusBadge.degrading', {
      defaultMessage: 'Degrading',
    }),
    badgeColor: 'warning',
  },
  VIOLATED: {
    displayText: i18n.translate('xpack.slo.sloStatusBadge.violated', {
      defaultMessage: 'Violated',
    }),
    badgeColor: 'danger',
  },
  NO_DATA: {
    displayText: i18n.translate('xpack.slo.sloStatusBadge.noData', {
      defaultMessage: 'No Data',
    }),
    badgeColor: 'subdued',
  },
};

export function SloStatusPanel({ isLoading, slo }: Props) {
  const hasNoData = slo?.summary.status === 'NO_DATA';
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  if (isLoading || !slo) {
    return <EuiSkeletonText lines={2} data-test-subj="loadingTitle" />;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiPanel paddingSize="m" color={displayStatus[slo.summary.status].badgeColor} hasBorder>
        <EuiFlexGroup direction="row">
          <DefinitionItem
            title={i18n.translate('xpack.slo.sloDetails.overview.status', {
              defaultMessage: 'Status',
            })}
            subtitle={
              <EuiText size="s">
                <h2>{displayStatus[slo.summary.status].displayText}</h2>
              </EuiText>
            }
          />

          <DefinitionItem
            title={i18n.translate('xpack.slo.sloDetails.overview.observedValueTitle', {
              defaultMessage: 'Observed value',
            })}
            subtitle={
              <EuiText size="s">
                {i18n.translate('xpack.slo.sloDetails.overview.observedValueSubtitle', {
                  defaultMessage: '{value} (objective is {objective})',
                  values: {
                    value: hasNoData ? '-' : numeral(slo.summary.sliValue).format(percentFormat),
                    objective: numeral(slo.objective.target).format(percentFormat),
                  },
                })}
              </EuiText>
            }
          />
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
}
