/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { ALERT_STATUS_ALL } from '../../../common/constants';
import { updateSelectedOptions } from './update_selected_options';

describe('updateSelectedOptions()', () => {
  const mockedClearSelections = jest.fn();
  const mockedSetSelectedOptions = jest.fn();
  const alertFilterControlHandler = {
    children$: {
      getValue: () => [
        { clearSelections: mockedClearSelections, setSelectedOptions: mockedSetSelectedOptions },
      ],
    },
  } as any as FilterGroupHandler;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should not do anything if controlIndex is < 0', () => {
    updateSelectedOptions(ALERT_STATUS_ACTIVE, -1, alertFilterControlHandler);
    expect(mockedClearSelections).not.toHaveBeenCalled();
    expect(mockedSetSelectedOptions).not.toHaveBeenCalled();
  });

  it('Should not do anything if alertFilterControlHandler does not exist', () => {
    updateSelectedOptions(ALERT_STATUS_ACTIVE, 0);
    expect(mockedClearSelections).not.toHaveBeenCalled();
    expect(mockedSetSelectedOptions).not.toHaveBeenCalled();
  });

  it('Should clear selection if status is all', () => {
    updateSelectedOptions(ALERT_STATUS_ALL, 0, alertFilterControlHandler);
    expect(mockedClearSelections).toHaveBeenCalledTimes(1);
    expect(mockedSetSelectedOptions).not.toHaveBeenCalled();
  });

  it('Should change selected option is status is active', () => {
    updateSelectedOptions(ALERT_STATUS_ACTIVE, 0, alertFilterControlHandler);
    expect(mockedClearSelections).not.toHaveBeenCalled();
    expect(mockedSetSelectedOptions).toHaveBeenCalledTimes(1);
    expect(mockedSetSelectedOptions).toHaveBeenCalledWith(['active']);
  });
});
