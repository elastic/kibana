/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';

const ERROR_MESSAGES = {
  notFound: {
    title: <FormattedMessage id="xpack.queryRules.notFoundTitle" defaultMessage="Not found" />,
    body: (
      <FormattedMessage
        id="xpack.queryRuleset.notFoundDescription"
        defaultMessage="Requested resource was not found. Check if the URL is correct."
      />
    ),
    analyticsEvent: AnalyticsEvents.notFoundErrorPromptLoaded,
  },
  generic: {
    title: <FormattedMessage id="xpack.queryRules.errorTitle" defaultMessage="An error occurred" />,
    body: (
      <FormattedMessage
        id="xpack.queryRules.errorDescription"
        defaultMessage="An error occurred while fetching query rules. Check Kibana logs for more information."
      />
    ),
    analyticsEvent: AnalyticsEvents.genericErrorPromptLoaded,
  },
  missingPermissions: {
    title: (
      <FormattedMessage
        id="xpack.queryRules.missingPermissionsTitle"
        defaultMessage="Missing permissions"
      />
    ),
    body: (
      <FormattedMessage
        id="xpack.queryRules.missingPermissionsDescription"
        defaultMessage="You do not have the necessary permissions to manage query rules. Contact your system administrator."
      />
    ),
    analyticsEvent: AnalyticsEvents.missingPermissionsErrorPromptLoaded,
  },
};

export const ErrorPrompt: React.FC<{
  errorType: 'missingPermissions' | 'generic' | 'notFound';
}> = ({ errorType }) => {
  const useTracker = useUsageTracker();
  useEffect(() => {
    useTracker?.load?.(ERROR_MESSAGES[errorType].analyticsEvent);
  }, [errorType, useTracker]);
  return (
    <EuiEmptyPrompt
      iconType="logoElasticsearch"
      title={<h2>{ERROR_MESSAGES[errorType].title}</h2>}
      body={<p>{ERROR_MESSAGES[errorType].body}</p>}
    />
  );
};
