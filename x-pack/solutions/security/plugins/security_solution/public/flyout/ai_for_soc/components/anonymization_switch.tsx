/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { useAlertsContext } from '../../../detections/components/alerts_table/alerts_context';

export const ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID =
  'ai-for-soc-alert-flyout-alert-summary-anonymize-toggle';

/**
 * Renders a toggle switch that allows users to enable or
 * disable the display of anonymized values in alert summary
 */
export const AnonymizationSwitch = memo(() => {
  const { setShowAnonymizedValues, showAnonymizedValues } = useAlertsContext();

  const onChangeShowAnonymizedValues = useCallback(
    (e: EuiSwitchEvent) => {
      setShowAnonymizedValues(e.target.checked);
    },
    [setShowAnonymizedValues]
  );

  return (
    <>
      {showAnonymizedValues !== undefined && (
        <EuiSwitch
          data-test-subj={ALERT_SUMMARY_ANONYMIZE_TOGGLE_TEST_ID}
          checked={showAnonymizedValues ?? false}
          compressed
          label={i18n.translate('xpack.securitySolution.flyout.settings.anonymizeValues', {
            defaultMessage: 'Show anonymized values',
          })}
          onChange={onChangeShowAnonymizedValues}
        />
      )}
    </>
  );
});

AnonymizationSwitch.displayName = 'AnonymizationSwitch';
