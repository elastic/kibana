/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen, waitForEuiPopoverClose } from '@elastic/eui/lib/test/rtl';
import { AddDataProviderPopover } from '../add_data_provider_popover';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvidersComponent } from '../../../../../common/mock/test_providers';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';

const TEST_ID = {
  ADD_FIELD: 'addField',
};

const clickOnAddField = async () => {
  const addFieldButton = screen.getByTestId(TEST_ID.ADD_FIELD);
  await userEvent.click(addFieldButton);
};

describe('Testing AddDataProviderPopover', () => {
  it('Test Popover is visible', async () => {
    render(
      <TestProvidersComponent>
        <AddDataProviderPopover browserFields={mockBrowserFields} timelineId="some_ID" />
      </TestProvidersComponent>
    );

    await clickOnAddField();
    await waitForEuiPopoverOpen();
  });

  it('Test Popover goes away after clicking again on add field', async () => {
    render(
      <TestProvidersComponent>
        <AddDataProviderPopover browserFields={mockBrowserFields} timelineId="some_ID" />
      </TestProvidersComponent>
    );

    await clickOnAddField();
    await waitForEuiPopoverOpen();

    await clickOnAddField();
    await waitForEuiPopoverClose();
  });
});
