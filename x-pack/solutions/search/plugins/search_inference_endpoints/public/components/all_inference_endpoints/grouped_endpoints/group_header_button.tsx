/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ELASTIC_MODEL_DEFINITIONS } from '@kbn/ml-trained-models-utils';

import { MIT_LICENSE } from '../render_table_columns/render_model/translations';
import { GroupByOptions, type GroupedInferenceEndpointsData } from '../../../types';

export interface GroupByHeaderButtonProps {
  data: GroupedInferenceEndpointsData;
  groupBy: GroupByOptions;
}
export const GroupByHeaderButton = ({ data, groupBy }: GroupByHeaderButtonProps) => {
  const { isEligibleForMITBadge, modelDefinition } = useMemo(() => {
    if (groupBy !== GroupByOptions.Model) return { isEligibleForMITBadge: false };
    const modelDef = ELASTIC_MODEL_DEFINITIONS[data.groupId];
    return {
      isEligibleForMITBadge: modelDef?.license === 'MIT',
      modelDefinition: modelDef,
    };
  }, [groupBy, data.groupId]);
  return (
    <EuiFlexGroup gutterSize="m" alignItems="center">
      <EuiText>
        <strong>{data.groupLabel}</strong>
      </EuiText>
      {isEligibleForMITBadge && (
        // eslint-disable-next-line @elastic/eui/href-or-on-click
        <EuiBadge
          color="hollow"
          iconType="popout"
          iconSide="right"
          href={modelDefinition?.licenseUrl ?? ''}
          target="_blank"
          data-test-subj="mit-license-badge"
          // @ts-ignore - upstream type disables onClick, but we need it to stop accordion control when badge is clicked.
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.stopPropagation();
          }}
        >
          {MIT_LICENSE}
        </EuiBadge>
      )}
      <EuiBadge>
        {i18n.translate(
          'xpack.searchInferenceEndpoints.groupedEndpoints.headers.endpointsCountBadge',
          {
            defaultMessage:
              '{endpointCount} {endpointCount, plural, one {endpoint} other {endpoints}}',
            values: {
              endpointCount: data.endpoints.length,
            },
          }
        )}
      </EuiBadge>
    </EuiFlexGroup>
  );
};
