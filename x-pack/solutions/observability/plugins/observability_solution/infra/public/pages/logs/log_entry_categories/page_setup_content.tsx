/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiText, EuiButton } from '@elastic/eui';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';

interface LogEntryCategoriesSetupContentProps {
  onOpenSetup: () => void;
}

export const LogEntryCategoriesSetupContent: React.FunctionComponent<
  LogEntryCategoriesSetupContentProps
> = ({ onOpenSetup }) => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_setup', delay: 15000 });

  return (
    <KibanaPageTemplate.EmptyPrompt
      data-test-subj="logEntryCategoriesSetupPage"
      title={
        <h2>
          <FormattedMessage
            id="xpack.infra.logs.logEntryCategories.setupTitle"
            defaultMessage="Set up log category analysis"
          />
        </h2>
      }
      body={
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.infra.logs.logEntryCategories.setupDescription"
              defaultMessage="To enable log categories, set up a machine learning job."
            />
          </p>
        </EuiText>
      }
      actions={
        <EuiButton
          data-test-subj="infraLogEntryCategoriesSetupContentMlSetupButton"
          fill
          onClick={onOpenSetup}
        >
          <FormattedMessage
            id="xpack.infra.logs.logEntryCategories.showAnalysisSetupButtonLabel"
            defaultMessage="ML setup"
          />
        </EuiButton>
      }
    />
  );
};
