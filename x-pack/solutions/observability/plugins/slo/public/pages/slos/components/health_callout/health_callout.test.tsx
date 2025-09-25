/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { HealthCallout } from './health_callout';
import { useFetchSloHealth } from '../../../../hooks/use_fetch_slo_health';

jest.mock('../../../../hooks/use_fetch_slo_health');

const mockUseFetchSloHealth = useFetchSloHealth as jest.Mock;

describe('HealthCallout', () => {
  it('should render unhealthy message when only unhealthy transforms are present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'unhealthy', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Transform error detected/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following transform is in an unhealthy state:'
    );
  });

  it('should render missing message when only missing transforms are present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'missing', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Transform error detected/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following transform is in a missing state:'
    );
  });

  it('should render unhealthy or missing message when both are present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'unhealthy', summary: 'healthy' },
        },
        {
          sloId: '2',
          health: { overall: 'unhealthy', rollup: 'missing', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Transform error detected/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following transforms are in an unhealthy or missing state:'
    );
  });
});
