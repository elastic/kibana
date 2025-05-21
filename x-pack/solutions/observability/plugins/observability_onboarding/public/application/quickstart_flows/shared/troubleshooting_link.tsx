/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function TroubleshootingLink() {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center">
      <EuiButtonEmpty
        data-test-subj="observabilityOnboardingTroubleshootingLinkTroubleshootingButton"
        iconType="help"
        color="primary"
        href="https://www.elastic.co/guide/en/observability/current/logs-troubleshooting.html"
        target="_blank"
      >
        {i18n.translate('xpack.observability_onboarding.installElasticAgent.troubleshooting', {
          defaultMessage: 'Troubleshooting',
        })}
      </EuiButtonEmpty>
    </EuiFlexGroup>
  );
}
