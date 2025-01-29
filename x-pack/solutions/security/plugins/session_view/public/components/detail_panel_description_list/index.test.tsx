/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { DetailPanelDescriptionList } from '.';

const TEST_FIRST_TITLE = 'item title';
const TEST_FIRST_DESCRIPTION = 'item description';
const TEST_SECOND_TITLE = 'second title';
const TEST_SECOND_DESCRIPTION = 'second description';
const TEST_LIST_ITEM = [
  {
    title: TEST_FIRST_TITLE,
    description: TEST_FIRST_DESCRIPTION,
  },
  {
    title: TEST_SECOND_TITLE,
    description: TEST_SECOND_DESCRIPTION,
  },
];

describe('DetailPanelDescriptionList component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When DetailPanelDescriptionList is mounted', () => {
    it('renders DetailPanelDescriptionList correctly', async () => {
      renderResult = mockedContext.render(
        <DetailPanelDescriptionList listItems={TEST_LIST_ITEM} />
      );

      expect(renderResult.queryByTestId('sessionView:detail-panel-description-list')).toBeVisible();

      // check list items are rendered
      expect(renderResult.queryByText(TEST_FIRST_TITLE)).toBeVisible();
      expect(renderResult.queryByText(TEST_FIRST_DESCRIPTION)).toBeVisible();
      expect(renderResult.queryByText(TEST_SECOND_TITLE)).toBeVisible();
      expect(renderResult.queryByText(TEST_SECOND_DESCRIPTION)).toBeVisible();
    });
  });
});
