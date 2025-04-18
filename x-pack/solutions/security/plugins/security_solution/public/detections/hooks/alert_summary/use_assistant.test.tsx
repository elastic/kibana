/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { UseAssistantParams, UseAssistantResult } from './use_assistant';
import { useAssistant } from './use_assistant';
import { useAssistantOverlay } from '@kbn/elastic-assistant';
import type { Alert } from '@kbn/alerting-types';

jest.mock('@kbn/elastic-assistant');

describe('useAssistant', () => {
  let hookResult: RenderHookResult<UseAssistantResult, UseAssistantParams>;

  it('should return showAssistant true and a value for promptContextId', () => {
    const showAssistantOverlay = jest.fn();
    jest
      .mocked(useAssistantOverlay)
      .mockReturnValue({ showAssistantOverlay, promptContextId: '123' });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
    };

    hookResult = renderHook((props: UseAssistantParams) => useAssistant(props), {
      initialProps: { alert },
    });

    expect(hookResult.result.current.showAssistantOverlay).toEqual(showAssistantOverlay);
  });
});
