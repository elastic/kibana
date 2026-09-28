/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { renderInvestigationIocsSummary } from './summary_rows';

const renderSummary = (data: unknown) =>
  render(<I18nProvider>{renderInvestigationIocsSummary({ data })}</I18nProvider>);

describe('renderInvestigationIocsSummary', () => {
  it('renders one read-only row per indicator, in category order', async () => {
    renderSummary({
      ips: [{ value: '203.0.113.8', comment: 'C2 contacted by FIN-DB-02' }],
      shas: [{ value: 'abc123' }],
      file_paths: [],
    });

    expect(screen.getByText('Indicators of compromise')).toBeInTheDocument();
    const labels = screen.getAllByTestId('attachmentSummaryRowLabel').map((el) => el.textContent);
    expect(labels).toEqual(['abc123', '203.0.113.8']);

    const icons = screen.getAllByTestId('attachmentSummaryRowIcon');
    await userEvent.hover(icons[0]);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('SHA256');
    await userEvent.unhover(icons[0]);
    await userEvent.hover(icons[1]);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'IP addresses — C2 contacted by FIN-DB-02'
    );
    expect(screen.queryByTestId('attachmentSummaryRowButton')).not.toBeInTheDocument();
  });

  it.each([
    ['no indicators', {}],
    ['empty categories', { shas: [], ips: [{ value: '' }] }],
    ['missing data', undefined],
  ])('renders nothing for %s', (_name, data) => {
    const { container } = renderSummary(data);
    expect(container).toBeEmptyDOMElement();
  });
});
