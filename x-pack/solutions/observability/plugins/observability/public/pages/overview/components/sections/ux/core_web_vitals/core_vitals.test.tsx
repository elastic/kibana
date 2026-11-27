/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { fireEvent } from '@testing-library/react';
import type { UXMetrics } from '@kbn/observability-shared-plugin/public';
import { render } from '../../../../../../utils/test_helper';
import CoreVitals from './core_vitals';
import { getCoreVitalsComponent } from './get_core_web_vitals_lazy';

const COLORS = ['success', 'warning', 'danger'] as const;

const renderWithReferenceColors = (props: { loading: boolean; data: UXMetrics }) => {
  const view = render(
    <>
      {COLORS.map((color) => (
        <EuiTextColor key={color} color={color} data-test-subj={`${color}Reference`} />
      ))}
      <CoreVitals {...props} />
    </>
  );
  const colorOf = (color: (typeof COLORS)[number]) =>
    getComputedStyle(view.getByTestId(`${color}Reference`)).color;
  return { ...view, colorOf };
};

describe('CoreVitals', () => {
  it('colors each percentile by its own rating, not by the largest distribution bucket', () => {
    const { getByText, colorOf } = renderWithReferenceColors({
      loading: false,
      data: {
        lcp: 3110,
        lcpRanks: [54, 30, 16],
        inp: 241,
        inpRanks: [62, 30, 8],
        cls: 0,
        clsRanks: [10, 20, 70],
      },
    });

    expect(getByText('3.11 s')).toHaveStyle({ color: colorOf('warning') });
    expect(getByText('241 ms')).toHaveStyle({ color: colorOf('warning') });
    expect(getByText('0.000')).toHaveStyle({ color: colorOf('success') });
  });

  it('colors poor percentiles as danger', () => {
    const { getByText, colorOf } = renderWithReferenceColors({
      loading: false,
      data: { lcp: 4000.1, inp: 501, cls: 0.26 },
    });

    expect(getByText('4.00 s')).toHaveStyle({ color: colorOf('danger') });
    expect(getByText('501 ms')).toHaveStyle({ color: colorOf('danger') });
    expect(getByText('0.260')).toHaveStyle({ color: colorOf('danger') });
  });

  it('does not color the loading placeholders', () => {
    const { getAllByText, colorOf } = renderWithReferenceColors({
      loading: true,
      data: { lcp: 3110, inp: 241, cls: 0 },
    });

    for (const placeholder of getAllByText('--')) {
      for (const color of COLORS) {
        expect(placeholder).not.toHaveStyle({ color: colorOf(color) });
      }
    }
  });

  it('renders missing measurements as no data', () => {
    const { getAllByText } = render(
      <CoreVitals loading={false} data={{ lcp: null, inp: undefined, cls: null }} />
    );

    expect(getAllByText('No data is available.')).toHaveLength(3);
  });

  it.each([
    [999.4, '999 ms'],
    [999.5, '1.00 s'],
    [1000, '1.00 s'],
  ])('formats %s ms as %s', (value, formatted) => {
    const { getByTestId } = render(
      <CoreVitals loading={false} data={{ lcp: value, inp: value }} />
    );

    expect(getByTestId('lcp-core-vital')).toHaveTextContent(formatted);
    expect(getByTestId('inp-core-vital')).toHaveTextContent(formatted);
  });

  it.each([
    ['Needs improvement-30', /more than 2\.50 s and less than 4\.00 s/],
    ['Good-62', /less than 200 ms/],
    ['Poor-70', /more than 0\.25/],
  ])('describes the rating thresholds in the %s tooltip', async (legend, message) => {
    const { getByTestId, findByText } = render(
      <CoreVitals
        loading={false}
        data={{
          lcp: 3110,
          lcpRanks: [54, 30, 16],
          inp: 241,
          inpRanks: [62, 28, 10],
          cls: 0.3,
          clsRanks: [10, 20, 70],
        }}
      />
    );

    fireEvent.mouseOver(getByTestId(legend));

    expect(await findByText(message)).toBeInTheDocument();
  });

  it('renders an h3 heading with the Learn more link by default', () => {
    const { getByRole } = render(<CoreVitals loading={false} />);

    expect(getByRole('heading', { level: 3, name: 'Core web vitals' })).toBeInTheDocument();
    expect(getByRole('link', { name: /Learn more/ })).toHaveAttribute(
      'href',
      'https://ela.st/vtls'
    );
  });

  it('forwards the heading level through the lazy component', async () => {
    const { findByRole } = render(getCoreVitalsComponent({ loading: false, headingLevel: 'h2' }));

    expect(await findByRole('heading', { level: 2, name: 'Core web vitals' })).toBeInTheDocument();
  });
});
