/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestProviders } from '../../../../common/mock';
import { SESSION_VIEW_UPSELL_TEST_ID, SESSION_VIEW_NO_DATA_TEST_ID } from './test_ids';
import { SessionViewNoDataMessage } from './session_view_no_data_message';

const NO_DATA_MESSAGE =
  'You can only view Linux session details if you’ve enabled the Include session data setting in your Elastic Defend integration policy. Refer to Enable Session View data(external, opens in a new tab or window) for more information.';

const UPSELL_TEXT = 'This feature requires an Enterprise subscription';

const renderSessionViewNoDataMessage = ({
  isEnterprisePlus,
  hasSessionViewConfig,
}: {
  isEnterprisePlus: boolean;
  hasSessionViewConfig: boolean;
}) =>
  render(
    <TestProviders>
      <SessionViewNoDataMessage
        isEnterprisePlus={isEnterprisePlus}
        hasSessionViewConfig={hasSessionViewConfig}
      />
    </TestProviders>
  );

describe('<SessionViewNoDataMessage />', () => {
  it('renders license upsell message if license is not Enterprise', () => {
    const { getByTestId } = renderSessionViewNoDataMessage({
      isEnterprisePlus: false,
      hasSessionViewConfig: false,
    });

    expect(getByTestId(SESSION_VIEW_UPSELL_TEST_ID)).toHaveTextContent(UPSELL_TEXT);
  });

  it('renders no session view message if hasSessionViewConfig is false', () => {
    const { getByTestId } = renderSessionViewNoDataMessage({
      isEnterprisePlus: true,
      hasSessionViewConfig: false,
    });
    expect(getByTestId(SESSION_VIEW_NO_DATA_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('renders null if neither is false', () => {
    const { container } = renderSessionViewNoDataMessage({
      isEnterprisePlus: true,
      hasSessionViewConfig: true,
    });
    expect(container).toBeEmptyDOMElement();
  });
});
