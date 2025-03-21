/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { useAlertsContext } from '../../../detections/components/alerts_table/alerts_context';

export const AnonymizationSwitch: React.FC = () => {
  const { setShowAnonymizedValues, showAnonymizedValues } = useAlertsContext();

  const onChangeShowAnonymizedValues = useCallback(
    (e: EuiSwitchEvent) => {
      setShowAnonymizedValues(e.target.checked);
    },
    [setShowAnonymizedValues]
  );

  return (
    <EuiSwitch
      label={i18n.translate('xpack.securitySolution.flyout.settings.anonymizeValues', {
        defaultMessage: 'Show anonymized values',
      })}
      checked={showAnonymizedValues}
      onChange={onChangeShowAnonymizedValues}
      compressed
    />
  );
};
