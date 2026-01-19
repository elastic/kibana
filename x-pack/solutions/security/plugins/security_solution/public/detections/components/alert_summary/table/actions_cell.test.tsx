/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { ActionsCell } from './actions_cell';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { MORE_ACTIONS_BUTTON_TEST_ID } from './more_actions_row_control_column';
import { useAddToCaseActions } from '../../alerts_table/timeline_actions/use_add_to_case_actions';
import { useAlertTagsActions } from '../../alerts_table/timeline_actions/use_alert_tags_actions';
import { ROW_ACTION_FLYOUT_ICON_TEST_ID } from './open_flyout_row_control_column';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../alerts_table/timeline_actions/use_add_to_case_actions');
jest.mock('../../alerts_table/timeline_actions/use_alert_tags_actions');

describe('ActionsCell', () => {
  it('should render icons', () => {
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({
      openFlyout: jest.fn(),
    });
    (useAddToCaseActions as jest.Mock).mockReturnValue({
      addToCaseActionItems: [],
    });
    (useAlertTagsActions as jest.Mock).mockReturnValue({
      alertTagsItems: [],
      alertTagsPanels: [],
    });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
    };
    const ecsAlert: Ecs = {
      _id: '_id',
      _index: '_index',
    };

    const { getByTestId } = render(<ActionsCell alert={alert} ecsAlert={ecsAlert} />);

    expect(getByTestId(ROW_ACTION_FLYOUT_ICON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(MORE_ACTIONS_BUTTON_TEST_ID)).toBeInTheDocument();
  });
});
