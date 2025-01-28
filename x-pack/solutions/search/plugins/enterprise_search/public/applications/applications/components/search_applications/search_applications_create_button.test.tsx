/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { waitForEuiToolTipVisible } from '@elastic/eui/lib/test/rtl';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { CreateSearchApplicationButton } from './search_applications_list';

function Container({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

describe('CreateSearchApplicationButton', () => {
  test('disabled={false}', async () => {
    render(
      <Container>
        <CreateSearchApplicationButton disabled={false} />
      </Container>
    );

    await userEvent.hover(
      await screen.findByTestId('enterprise-search-search-applications-creation-button')
    );

    await waitForEuiToolTipVisible();

    expect(
      await screen.findByTestId('create-search-application-button-popover-content')
    ).toBeInTheDocument();
  });
});
