/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { useCanEditSynthetics } from '../../../../../../hooks/use_capabilities';

export const MonitorsPageHeader = () => {
  const canEditSynthetics = useCanEditSynthetics();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.synthetics.monitors.pageHeader.title"
          defaultMessage="Monitors"
        />
      </EuiFlexItem>
      {!canEditSynthetics && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={READ_ONLY_BADGE_TOOLTIP}>
            <EuiBadge
              iconType="readOnly"
              color="hollow"
              tabIndex={0}
              data-test-subj="syntheticsReadOnlyBadge"
            >
              {READ_ONLY_BADGE_LABEL}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const READ_ONLY_BADGE_LABEL = i18n.translate('xpack.synthetics.monitors.pageHeader.readOnly', {
  defaultMessage: 'Read only',
});

const READ_ONLY_BADGE_TOOLTIP = i18n.translate(
  'xpack.synthetics.monitors.pageHeader.readOnlyTooltip',
  {
    defaultMessage: 'You do not have permission to create or edit monitors.',
  }
);
