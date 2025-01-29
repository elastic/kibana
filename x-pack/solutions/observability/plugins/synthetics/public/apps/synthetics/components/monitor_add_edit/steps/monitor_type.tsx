/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBetaBadge, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormMonitorType } from '../types';
import { MONITOR_TYPE_CONFIG } from '../form/field_config';

export const MonitorType = ({ monitorType }: { monitorType: FormMonitorType }) => {
  const config = MONITOR_TYPE_CONFIG[monitorType];
  return (
    <>
      <EuiText color="subdued" size="s">
        {i18n.translate('xpack.synthetics.monitorConfig.monitorType.label', {
          defaultMessage: 'Monitor type',
        })}
      </EuiText>
      <EuiText size="s">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <strong>{config.descriptionTitle}</strong>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {config.beta && (
              <EuiBetaBadge
                label="Beta"
                tooltipContent={i18n.translate(
                  'xpack.synthetics.monitorConfig.monitorType.betaLabel',
                  {
                    defaultMessage:
                      'This functionality is in beta and is subject to change. The design and code is less mature than official generally available features and is being provided as-is with no warranties. Beta features are not subject to the support service level agreement of official generally available features.',
                  }
                )}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    </>
  );
};
