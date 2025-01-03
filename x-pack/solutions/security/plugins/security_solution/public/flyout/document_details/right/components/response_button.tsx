/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LeftPanelResponseTab } from '../../left';
import { RESPONSE_BUTTON_TEST_ID } from './test_ids';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';

/**
 * Response button that opens Response section in the left panel
 */
export const ResponseButton: React.FC = () => {
  const { navigateToLeftPanel: goToResponseTab } = useNavigateToLeftPanel({
    tab: LeftPanelResponseTab,
  });

  return (
    <>
      <EuiButton
        onClick={goToResponseTab}
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
