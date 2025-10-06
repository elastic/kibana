/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../../common/constants';
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

  it('should show only 1 missing summary transform', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'healthy', summary: 'missing' },
        },
        {
          sloId: '2',
          health: { overall: 'healthy', rollup: 'healthy', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout
          sloList={[{ id: '1', name: 'SLO 1' }, { id: '2', name: 'SLO 2' }]}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Transform error detected/));
    expect(screen.getByTestId('sloHealthCalloutDescription').textContent).toBe(
      'The following transform is in a missing state:'
    );
    const summaryTransformId = getSLOSummaryTransformId('1', undefined);
    expect(screen.getByText((content, element) => content.startsWith(summaryTransformId))).toBeInTheDocument();
    const summaryTransformId2 = getSLOSummaryTransformId('2', undefined);
    expect(screen.queryByText((content, element) => content.startsWith(summaryTransformId2))).not.toBeInTheDocument();
  });

  it('should show 2 missing entries for summary and rollup', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'missing', summary: 'missing' },
        },
        {
          sloId: '2',
          health: { overall: 'healthy', rollup: 'healthy', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout
          sloList={[{ id: '1', name: 'SLO 1' }, { id: '2', name: 'SLO 2' }]}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Transform error detected/));
    expect(screen.getByText(/The following transforms are in a missing state:/)).toBeInTheDocument();
    const summaryTransformId = getSLOSummaryTransformId('1', undefined);
    expect(screen.getByText((content, element) => content.startsWith(summaryTransformId))).toBeInTheDocument();
    const summaryTransformId2 = getSLOSummaryTransformId('2', undefined);
    expect(screen.queryByText((content, element) => content.startsWith(summaryTransformId2))).not.toBeInTheDocument();
  });

  it('should show a mix of missing and unhealthy entries', () => {
    mockUseFetchSloHealth.mockReturnValue({
      data: [
        {
          sloId: '1',
          health: { overall: 'unhealthy', rollup: 'unhealthy', summary: 'missing' },
        },
        {
          sloId: '2',
          health: { overall: 'unhealthy', rollup: 'missing', summary: 'unhealthy' },
        },
        {
          sloId: '3',
          health: { overall: 'healthy', rollup: 'healthy', summary: 'healthy' },
        },
      ],
    });

    render(
      <I18nProvider>
        <HealthCallout
          sloList={[
            { id: '1', name: 'SLO 1' },
            { id: '2', name: 'SLO 2' },
            { id: '3', name: 'SLO 3' },
          ]}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText(/Transform error detected/));
    expect(
      screen.getByText(/The following transforms are in an unhealthy or missing state:/)
    ).toBeInTheDocument();

    const rollupTransformId1 = getSLOTransformId('1', undefined);
    expect(screen.getByText((content, element) => content.startsWith(rollupTransformId1))).toBeInTheDocument();

    const summaryTransformId1 = getSLOSummaryTransformId('1', undefined);
    expect(screen.getByText((content, element) => content.startsWith(summaryTransformId1))).toBeInTheDocument();

    const rollupTransformId2 = getSLOTransformId('2', undefined);
    expect(screen.getByText((content, element) => content.startsWith(rollupTransformId2))).toBeInTheDocument();

    const summaryTransformId2 = getSLOSummaryTransformId('2', undefined);
    expect(screen.getByText((content, element) => content.startsWith(summaryTransformId2))).toBeInTheDocument();
  });
});