/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ProgressIndicator } from './progress_indicator';

const renderIndicator = (props: React.ComponentProps<typeof ProgressIndicator>) =>
  render(
    <I18nProvider>
      <ProgressIndicator {...props} />
    </I18nProvider>
  );

describe('ProgressIndicator', () => {
  it('shows a spinner without the default CallOut info icon while loading', () => {
    const { container } = renderIndicator({
      title: 'Waiting for data to be shipped',
      isLoading: true,
    });

    // EUI's Jest test-env stubs EuiIcon, so a component iconType shows up as data-euiicon-type.
    expect(container.querySelector('[data-euiicon-type="EuiLoadingSpinner"]')).not.toBeNull();
    expect(container.querySelector('[data-euiicon-type="infoFill"]')).toBeNull();
  });

  it('shows a single success icon and no spinner when loaded', () => {
    const { container } = renderIndicator({
      title: 'We are monitoring your host',
      iconType: 'checkCircleFill',
      isLoading: false,
    });

    expect(container.querySelector('[data-euiicon-type="EuiLoadingSpinner"]')).toBeNull();
    expect(container.querySelectorAll('[data-euiicon-type="checkCircleFill"]')).toHaveLength(1);
  });
});
