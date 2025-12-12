/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFlyoutApi } from '@kbn/flyout';
import {
  DocumentDetailsResponsePanelKey,
  DocumentDetailsRightPanelKey,
} from '../../shared/constants/panel_keys';
import { useDocumentDetailsContext } from '../../shared/context';
import { RESPONSE_BUTTON_TEST_ID } from './test_ids';

/**
 * Response button that opens Response section in the left panel
 */
export const ResponseButton: React.FC = () => {
  const { eventId, indexName, scopeId } = useDocumentDetailsContext();

  const { openFlyout } = useFlyoutApi();
  const openResponseFlyout = useCallback(
    () =>
      openFlyout(
        {
          main: {
            id: DocumentDetailsResponsePanelKey,
            params: {
              id: eventId,
              indexName,
              scopeId,
              isChild: false,
            },
          },
          child: {
            id: DocumentDetailsRightPanelKey,
            params: {
              id: eventId,
              indexName,
              scopeId,
              isChild: true,
            },
          },
        },
        { mainSize: 'm' }
      ),
    [eventId, indexName, openFlyout, scopeId]
  );

  return (
    <>
      <EuiButton
        onClick={openResponseFlyout}
        iconType="documentation"
        data-test-subj={RESPONSE_BUTTON_TEST_ID}
        size="s"
      >
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.response.responseButtonLabel"
          defaultMessage="Response"
        />
      </EuiButton>
    </>
  );
};

ResponseButton.displayName = 'ResponseButton';
