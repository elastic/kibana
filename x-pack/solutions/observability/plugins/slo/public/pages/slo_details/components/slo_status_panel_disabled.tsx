/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiPanel, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { DefinitionItem } from './overview/definition_item';

export function SloStatusPanelDisabled() {
  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.slo.sloStateBadge.disabled.tooltip', {
          defaultMessage: 'This SLO is disabled. Enable it to start processing data.',
        })}
      >
        <EuiPanel paddingSize="m" color={'subdued'} hasBorder>
          <DefinitionItem
            title={i18n.translate('xpack.slo.sloDetails.overview.status', {
              defaultMessage: 'Status',
            })}
            subtitle={
              <EuiText size="s">
                <h2>
                  {i18n.translate('xpack.slo.sloStateBadge.disabled.label', {
                    defaultMessage: 'Disabled',
                  })}
                </h2>
              </EuiText>
            }
          />
        </EuiPanel>
      </EuiToolTip>
    </EuiFlexItem>
  );
}
