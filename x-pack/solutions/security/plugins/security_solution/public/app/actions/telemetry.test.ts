/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServices } from '../../types';
import { enhanceActionWithTelemetry } from './telemetry';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { AppEventTypes } from '../../common/lib/telemetry';

const actionId = 'test_action_id';
const displayName = 'test-actions';
const fieldName = 'test.user.name';
const fieldValue = 'test value';
const metadata = undefined;

const action = createAction<CellActionExecutionContext>({
  id: actionId,
  execute: async () => {},
  getIconType: () => 'test-icon',
  getDisplayName: () => displayName,
});
const context = {
  data: [{ field: { name: fieldName, type: 'text' }, value: fieldValue }],
  metadata,
} as CellActionExecutionContext;

describe('enhanceActionWithTelemetry', () => {
  it('calls telemetry report when the action is executed', () => {
    const telemetry = { reportEvent: jest.fn() };
    const services = { telemetry } as unknown as StartServices;

    const enhancedAction = enhanceActionWithTelemetry(action, services);
    enhancedAction.execute(context);

    expect(telemetry.reportEvent).toHaveBeenCalledWith(AppEventTypes.CellActionClicked, {
      displayName,
      actionId,
      fieldName,
      metadata,
    });
  });
});
