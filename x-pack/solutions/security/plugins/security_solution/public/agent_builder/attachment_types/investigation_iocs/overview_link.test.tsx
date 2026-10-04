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
import { renderInvestigationIocsDetails } from './overview_link';

const mockOpener = jest.fn((_props: unknown) => null);
jest.mock('./open_iocs_flyout_on_mount', () => ({
  InvestigationIocsFlyoutOpener: (props: unknown) => mockOpener(props),
}));

const resolveSecurityCanvasContext = jest.fn();

const renderDetails = (data: unknown) =>
  render(
    <I18nProvider>
      {renderInvestigationIocsDetails({ data }, resolveSecurityCanvasContext)}
    </I18nProvider>
  );

describe('renderInvestigationIocsDetails', () => {
  beforeEach(() => {
    mockOpener.mockClear();
  });

  it('renders one IOCs link that opens the indicators flyout', async () => {
    renderDetails({
      ips: [{ value: '203.0.113.8', comment: 'C2 contacted by FIN-DB-02' }],
      shas: [{ value: 'abc123' }],
      file_paths: [{ value: 'C:\\Users\\Public\\update.dll' }],
    });

    expect(screen.getByTestId('investigationIocsOverviewLink')).toHaveAccessibleName('IOCs');
    expect(screen.queryByText('abc123')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('investigationIocsOverviewLink'));

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
    const { container } = renderDetails(data);
    expect(container).toBeEmptyDOMElement();
  });
});
