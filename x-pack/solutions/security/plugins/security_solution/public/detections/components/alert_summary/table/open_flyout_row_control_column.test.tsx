/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import {
  OpenFlyoutRowControlColumn,
  ROW_ACTION_FLYOUT_ICON_TEST_ID,
} from './open_flyout_row_control_column';

const EASE_FLYOUT_TEST_ID = 'mockEaseFlyout';
jest.mock('../flyout/ease_flyout', () => ({
  EaseFlyout: ({ documentId, onClose }: { documentId: string; onClose: () => void }) => (
    <button type="button" data-test-subj="mockEaseFlyout" onClick={onClose}>
      {documentId}
    </button>
  ),
}));

const alert: Alert = {
  _id: '_id',
  _index: '_index',
};

describe('OpenFlyoutRowControlColumn', () => {
  it('should render button icon', () => {
    const { getByTestId, queryByTestId } = render(<OpenFlyoutRowControlColumn alert={alert} />);

    expect(getByTestId(ROW_ACTION_FLYOUT_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(EASE_FLYOUT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should open the flyout after click and close it', () => {
    const { getByTestId, queryByTestId } = render(<OpenFlyoutRowControlColumn alert={alert} />);

    fireEvent.click(getByTestId(ROW_ACTION_FLYOUT_ICON_TEST_ID));

    expect(getByTestId(EASE_FLYOUT_TEST_ID)).toHaveTextContent(alert._id);

    fireEvent.click(getByTestId(EASE_FLYOUT_TEST_ID));

    expect(queryByTestId(EASE_FLYOUT_TEST_ID)).not.toBeInTheDocument();
  });
});
