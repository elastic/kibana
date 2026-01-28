/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isSuppressionRuleInGA } from '../../../../../common/detection_engine/utils';

import { TechnicalPreviewBadge } from '../../../../common/components/technical_preview_badge';
import { useUpsellingMessage } from '../../../../common/hooks/use_upselling';

interface AlertSuppressionLabelProps {
  label: string;
  ruleType: Type | undefined;
}

export const AlertSuppressionLabel = ({ label, ruleType }: AlertSuppressionLabelProps) => {
  const alertSuppressionUpsellingMessage = useUpsellingMessage('alert_suppression_rule_details');

  return (
    <>
      {ruleType && isSuppressionRuleInGA(ruleType) ? (
        label
      ) : (
        <TechnicalPreviewBadge label={label} />
      )}
      {alertSuppressionUpsellingMessage && (
        <EuiIconTip
          content={alertSuppressionUpsellingMessage}
          position="top"
          type="lock"
          size="l"
          anchorProps={{
            css: { marginLeft: '8px' },
          }}
          iconProps={{
            'data-test-subj': 'alertSuppressionInsufficientLicensingIcon',
          }}
        />
      )}
    </>
  );
};
