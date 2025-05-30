/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import {
  OpenFlyoutRowControlColumn,
  ROW_ACTION_FLYOUT_ICON_TEST_ID,
} from './open_flyout_row_control_column';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { IOCPanelKey } from '../../../../flyout/ai_for_soc/constants/panel_keys';

jest.mock('@kbn/expandable-flyout');

describe('OpenFlyoutRowControlColumn', () => {
  it('should render button icon', () => {
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
      openFlyout: jest.fn(),
    });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
    };

    const { getByTestId } = render(<OpenFlyoutRowControlColumn alert={alert} />);

    expect(getByTestId(ROW_ACTION_FLYOUT_ICON_TEST_ID)).toBeInTheDocument();
  });

  it('should open flyout after click', () => {
    const openFlyout = jest.fn();
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
      openFlyout,
    });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
    };

    const { getByTestId } = render(<OpenFlyoutRowControlColumn alert={alert} />);

    getByTestId(ROW_ACTION_FLYOUT_ICON_TEST_ID).click();

    expect(openFlyout).toHaveBeenCalledWith({
      right: {
        id: IOCPanelKey,
        params: {
          id: alert._id,
          indexName: alert._index,
        },
      },
    });
  });
});
