/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { ALL_VALUE, type SLOWithSummaryResponse } from '@kbn/slo-schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import React from 'react';
import { baseSlo } from '../../../../data/slo';
import {
  aHealthyTransformHealth,
  aMissingTransformHealth,
  anUnhealthyTransformHealth,
} from '../../../../data/slo/health';
import { useFetchSloHealth } from '../../../../hooks/use_fetch_slo_health';
import { HealthCallout } from './health_callout';

jest.mock('../../../../hooks/use_fetch_slo_health');

const mockUseFetchSloHealth = useFetchSloHealth as jest.Mock;

const mockSlo1: SLOWithSummaryResponse = cloneDeep({ ...baseSlo, id: '1', name: 'Test SLO 1' });
const mockSlo2: SLOWithSummaryResponse = cloneDeep({ ...baseSlo, id: '2', name: 'Test SLO 2' });

describe('HealthCallout', () => {
  it('should render unhealthy message when an unhealthy rollup transform is present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          id: '1',
          instanceId: ALL_VALUE,
          revision: 1,
          name: 'Test SLO 1',
          health: {
            isProblematic: true,
            rollup: anUnhealthyTransformHealth,
            summary: aHealthyTransformHealth,
          },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLO might have some operational problems. You can inspect it here:'
    );
  });

  it('should render unhealthy message when an unhealthy summary transform is present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          id: '1',
          instanceId: ALL_VALUE,
          revision: 1,
          name: 'Test SLO 1',
          health: {
            isProblematic: true,
            rollup: aHealthyTransformHealth,
            summary: anUnhealthyTransformHealth,
          },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLO might have some operational problems. You can inspect it here:'
    );
  });

  it('should render unhealthy message when a missing rollup transform is present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          id: '1',
          instanceId: ALL_VALUE,
          revision: 1,
          name: 'Test SLO 1',
          health: {
            isProblematic: true,
            rollup: aMissingTransformHealth,
            summary: aHealthyTransformHealth,
          },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLO might have some operational problems. You can inspect it here:'
    );
  });

  it('should render unhealthy message when a missing summary transform is present', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          id: '1',
          instanceId: ALL_VALUE,
          revision: 1,
          name: 'Test SLO 1',
          health: {
            isProblematic: true,
            rollup: aHealthyTransformHealth,
            summary: aMissingTransformHealth,
          },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLO might have some operational problems. You can inspect it here:'
    );
  });

  it('should not render if all SLOs are healthy', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          id: '1',
          instanceId: ALL_VALUE,
          revision: 1,
          name: 'Test SLO 1',
          health: {
            isProblematic: false,
            rollup: aHealthyTransformHealth,
            summary: aHealthyTransformHealth,
          },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1]} />
      </I18nProvider>
    );
    // The callout should not be present when all SLOs are healthy
    expect(screen.queryByText(/Some SLOs are unhealthy/)).toBeNull();
  });

  it('should list all unhealthy SLOs', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          id: '1',
          instanceId: ALL_VALUE,
          revision: 1,
          name: 'Test SLO 1',
          health: {
            isProblematic: true,
            rollup: anUnhealthyTransformHealth,
            summary: aHealthyTransformHealth,
          },
        },
        {
          id: '2',
          instanceId: ALL_VALUE,
          revision: 1,
          name: 'Test SLO 2',
          health: {
            isProblematic: true,
            rollup: aHealthyTransformHealth,
            summary: aMissingTransformHealth,
          },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout sloList={[mockSlo1, mockSlo2]} />
      </I18nProvider>
    );

    fireEvent.click(screen.getByText(/Some SLOs are unhealthy/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following SLOs might have some operational problems. You can inspect each one here:'
    );
  });
});
