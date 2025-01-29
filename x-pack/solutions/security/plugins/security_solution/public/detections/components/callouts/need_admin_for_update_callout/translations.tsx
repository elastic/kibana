/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  SecuritySolutionRequirementsLink,
  DetectionsRequirementsLink,
} from '../../../../common/components/links_to_docs';

export const NEED_ADMIN_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.needAdminForUpdateCallOutBody.messageTitle',
  {
    defaultMessage: 'Administration permissions required for alert migration',
  }
);

/**
 * Returns the formatted message of the call out body as a JSX Element with both the message
 * and two documentation links.
 */
export const needAdminForUpdateCallOutBody = (): JSX.Element => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.needAdminForUpdateCallOutBody.messageBody.messageDetail"
    defaultMessage="{essence} Related documentation: {docs}"
    values={{
      essence: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.needAdminForUpdateCallOutBody.messageBody.essenceDescription"
            defaultMessage="You are currently missing the required permissions to auto migrate your alert data. Please have your administrator visit this page one time to auto migrate your alert data."
          />
        </p>
      ),
      docs: (
        <ul>
          <li>
            <DetectionsRequirementsLink />
          </li>
          <li>
            <SecuritySolutionRequirementsLink />
          </li>
        </ul>
      ),
    }}
  />
);
