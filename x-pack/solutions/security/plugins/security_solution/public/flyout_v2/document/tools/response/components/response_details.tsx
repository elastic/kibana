/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { RESPONSE_DETAILS_TEST_ID } from './test_ids';
import { useResponseActionsView } from '../hooks/use_response_actions_view';

export interface ResponseDetailsContentProps {
  /**
   * Alert document used to fetch and display response actions.
   */
  hit: DataTableRecord;
  /**
   * Whether the flyout is opened in rule preview mode.
   */
  isRulePreview?: boolean;
}

/**
 * Automated response actions results.
 */
export const ResponseDetailsContent: React.FC<ResponseDetailsContentProps> = ({
  hit,
  isRulePreview = false,
}) => {
  const responseActionsView = useResponseActionsView({
    hit,
  });

  return (
    <div data-test-subj={RESPONSE_DETAILS_TEST_ID}>
      {isRulePreview ? (
        <FormattedMessage
          id="xpack.securitySolution.flyout.response.previewMessage"
          defaultMessage="Response is not available in alert preview."
        />
      ) : (
        <>
          <EuiTitle size="xxxs">
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.flyout.response.responseTitle"
                defaultMessage="Responses"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />

          {responseActionsView}
        </>
      )}
    </div>
  );
};

ResponseDetailsContent.displayName = 'ResponseDetailsContent';
