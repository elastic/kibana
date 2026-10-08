/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';

import * as i18n from '../translations';
import { ENTITY_ANALYTICS_ERROR_PANEL_TEST_ID } from '../test_ids';

export const EntityAnalyticsErrorPanel: React.FC<{
  entityStoreErrors: string[];
}> = ({ entityStoreErrors }) => {
  if (entityStoreErrors.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={i18n.ERROR_PANEL_TITLE}
        color="danger"
        iconType="error"
        data-test-subj={ENTITY_ANALYTICS_ERROR_PANEL_TEST_ID}
      >
        <p>{i18n.ERROR_PANEL_MESSAGE}</p>
        <EuiAccordion id="entity-analytics-errors" buttonContent={i18n.ERROR_PANEL_ERRORS}>
          <>
            {entityStoreErrors.map((error, index) => (
              <div key={index}>
                <EuiText size="s">{error}</EuiText>
                <EuiSpacer size="s" />
              </div>
            ))}
          </>
        </EuiAccordion>
      </EuiCallOut>
    </>
  );
};
