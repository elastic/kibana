/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { StatefulRowRenderersBrowser } from '.';
import * as i18n from './translations';

jest.mock('./row_renderers_browser', () => ({
  RowRenderersBrowser: () => null,
}));

describe('StatefulRowRenderersBrowser', () => {
  it('names the modal dialog with its visible title', () => {
    render(
      <TestProviders>
        <StatefulRowRenderersBrowser timelineId="timeline-test" />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('show-row-renderers-gear'));

    expect(
      screen.getByRole('dialog', { name: i18n.CUSTOMIZE_EVENT_RENDERERS_TITLE })
    ).toBeVisible();
  });
});
