/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export const STANDARD_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEY =
  'observability.alerts.standard.standardRulesOnlyCalloutDismissed.v1' as const;

const TITLE = i18n.translate('xpack.observability.alerts.standardRulesOnlyCallout.title', {
  defaultMessage: 'Standard rules only',
});

/**
 * Dismissible info callout explaining that the classic Alerts page only
 * shows alerts from Standard rules.
 */
export const StandardRulesOnlyCallout = () => {
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    STANDARD_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEY,
    false
  );

  if (isDismissed) {
    return null;
  }

  return (
    <EuiCallOut
      announceOnMount
      color="primary"
      iconType="info"
      size="s"
      title={TITLE}
      onDismiss={() => setIsDismissed(true)}
      data-test-subj="standardRulesOnlyCallout"
    >
      <FormattedMessage
        id="xpack.observability.alerts.standardRulesOnlyCallout.description"
        defaultMessage="This page only shows alerts from Standard rules."
      />
    </EuiCallOut>
  );
};
