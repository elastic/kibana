/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { renderInvestigationIocsSummary } from './summary_rows';

const mockOpener = jest.fn((_props: unknown) => null);
jest.mock('./open_iocs_flyout_on_mount', () => ({
  InvestigationIocsFlyoutOpener: (props: unknown) => mockOpener(props),
}));

const resolveSecurityCanvasContext = jest.fn();

const renderSummary = (data: unknown) =>
  render(
    <I18nProvider>
      {renderInvestigationIocsSummary({ data }, resolveSecurityCanvasContext)}
    </I18nProvider>
  );

describe('renderInvestigationIocsSummary', () => {
  beforeEach(() => {
    mockOpener.mockClear();
  });

  it('renders one row labeled with the populated categories', async () => {
    renderSummary({
      ips: [{ value: '203.0.113.8', comment: 'C2 contacted by FIN-DB-02' }],
      shas: [{ value: 'abc123' }],
      file_paths: [{ value: 'C:\\Users\\Public\\update.dll' }],
    });

    expect(screen.getByText('IOC')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByTestId('attachmentSummaryRowButton')).toHaveAccessibleName(
      'IOC: SHAs, IPs, File paths'
    );
    expect(screen.queryByText('abc123')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('attachmentSummaryRowButton'));

    await waitFor(() => expect(mockOpener).toHaveBeenCalled());
    expect(mockOpener).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: [
          expect.objectContaining({ id: 'shas' }),
          expect.objectContaining({ id: 'ips' }),
          expect.objectContaining({ id: 'file_paths' }),
        ],
        resolveSecurityCanvasContext,
      })
    );
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
