/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';
import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { TestProviders } from '../../mock';
import { MarkdownRenderer } from './renderer';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { UpsellingProvider } from '../upselling_provider';

jest.mock('../../utils/default_date_settings', () => {
  const original = jest.requireActual('../../utils/default_date_settings');
  return {
    ...original,
    getTimeRangeSettings: () => ({ to: '', from: '' }),
  };
});

jest.mock('../../utils/normalize_time_range', () => {
  const original = jest.requireActual('../../utils/normalize_time_range');
  return {
    ...original,
    normalizeTimeRange: () => ({ to: '', from: '' }),
  };
});

jest.mock('../../lib/kibana/kibana_react', () => {
  const original = jest.requireActual('../../lib/kibana/kibana_react');
  return {
    useKibana: () => ({
      ...original,
      services: {
        ...original.services,
        chrome: undefined,
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: (appId: string, options?: { path?: string; deepLinkId?: boolean }) =>
            `${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`,
        },
        uiSettings: {
          get: jest.fn(),
        },
        data: {
          dataViews: jest.fn(),
        },
      },
    }),
  };
});

jest.mock('../../hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
  }),
}));

const mockUpselling = new UpsellingService();

describe('Markdown', () => {
  describe('markdown links', () => {
    const markdownWithLink = 'A link to an external site [External Site](https://google.com)';

    test('it renders the expected link text', () => {
      const { getAllByText } = render(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);

      expect(
        getAllByText(removeExternalLinkText('External Site'), { exact: false })[0]
      ).toHaveTextContent('External Site');
    });

    test('it renders the expected href', () => {
      const { getByText } = render(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);
      expect(getByText((_, element) => element?.tagName === 'A')).toHaveAttribute(
        'href',
        'https://google.com'
      );
    });

    test('it renders the content as a text node if links are disabled', () => {
      const { getByText } = render(
        <MarkdownRenderer disableLinks={true}>{markdownWithLink}</MarkdownRenderer>
      );
      expect(getByText((_, element) => element?.tagName === 'P')).toBeInTheDocument();
    });

    test('it opens links in a new tab via target="_blank"', () => {
      const { getByText } = render(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);
      expect(getByText((_, element) => element?.tagName === 'A')).toHaveAttribute(
        'target',
        '_blank'
      );
    });

    test('it sets the link `rel` attribute to `noopener` to prevent the new page from accessing `window.opener`, `nofollow` to note the link is not endorsed by us, and noreferrer to prevent the browser from sending the current address', () => {
      const { getByText } = render(<MarkdownRenderer>{markdownWithLink}</MarkdownRenderer>);
      expect(getByText((_, element) => element?.tagName === 'A')).toHaveAttribute(
        'rel',
        'nofollow noopener noreferrer'
      );
    });

    test('displays an error callout when invalid markdown is detected', () => {
      const { getByText } = render(
        <MarkdownRenderer>{`!{investigate{"label": "Test action", "description": "Click to investigate", "providers": [[{"field": "event.id", "value": "{{kibana.alert.original_event.id}}", "queryType": "phrase", "excluded": "false"}],{"field":"event.action", "value": "", "queryType": "exists", "excluded": "false"},{"field": "process.pid", "value": "{{process.pid}}", "queryType": "phrase", "excluded":"false"}]]}}`}</MarkdownRenderer>
      );

      const errorCallout = getByText(/Invalid markdown detected/i);
      expect(errorCallout).toBeInTheDocument();
    });

    test('displays an upgrade message with a premium markdown plugin', () => {
      const { queryByText, getByText } = render(
        <TestProviders>
          <UpsellingProvider upsellingService={mockUpselling}>
            <MarkdownRenderer>{`!{investigate{"label": "",  "providers": [[{"field": "event.id", "value": "{{kibana.alert.original_event.id}}", "queryType": "phrase", "excluded": "false"}]]}}`}</MarkdownRenderer>
          </UpsellingProvider>
        </TestProviders>
      );

      const errorCallout = queryByText(/Invalid markdown detected/i);
      expect(errorCallout).toEqual(null);

      const upgradeMessage = getByText(/upgrade your subscription/i);
      expect(upgradeMessage).toBeInTheDocument();
    });
  });
});
