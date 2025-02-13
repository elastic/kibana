/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { BUTTON_TEST_ID, BackToInvestigatedAlert } from '.';

describe('BackToInvestigatedAlert component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When BackToInvestigatedAlert is mounted', () => {
    it('should render basic back button', async () => {
      renderResult = mockedContext.render(<BackToInvestigatedAlert onClick={jest.fn} />);

      expect(renderResult.queryByTestId(BUTTON_TEST_ID)).toBeTruthy();
    });
    it('should call onClick function by clicking the badge', async () => {
      const onClick = jest.fn();
      renderResult = mockedContext.render(<BackToInvestigatedAlert onClick={onClick} />);

      const badgeButton = renderResult.queryByTestId(BUTTON_TEST_ID);
      expect(badgeButton).toBeTruthy();
      badgeButton?.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
