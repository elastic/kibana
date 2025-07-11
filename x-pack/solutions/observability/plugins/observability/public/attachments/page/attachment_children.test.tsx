/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PageAttachmentPersistedState } from '@kbn/observability-schema';
import { render, screen } from '@testing-library/react';
import { PageAttachmentChildren } from './attachment_children';
import { useKibana } from '../../utils/kibana_react';

jest.mock('../../utils/kibana_react', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        navigateToUrl: jest.fn(),
      },
      http: {
        externalUrl: { isInternalUrl: jest.fn().mockReturnValue(true) },
      },
      notifications: { toasts: { addDanger: jest.fn() } },
    },
  }),
}));

describe('PageAttachmentChildren', () => {
  const mockNavigateToUrl = jest.fn();
  const mockPersistableState: PageAttachmentPersistedState = {
    type: 'mockType',
    url: {
      actionLabel: 'View in Dashboards',
      pathAndQuery: '/test/path?query=1',
      label: 'Sample Dashboard',
      iconType: 'link',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          navigateToUrl: mockNavigateToUrl,
        },
        http: {
          externalUrl: { isInternalUrl: jest.fn().mockReturnValue(true) },
        },
        notifications: { toasts: { addDanger: jest.fn() } },
      },
    });
  });

  it('renders the link with correct label and href', () => {
    render(<PageAttachmentChildren persistableStateAttachmentState={mockPersistableState} />);

    const link = screen.getByRole('button', { name: 'Sample Dashboard' });
    link.click();
    expect(mockNavigateToUrl).toHaveBeenCalledWith('http://localhost/test/path?query=1');
  });

  it('renders a callout when an external URL is detected', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          navigateToUrl: mockNavigateToUrl,
        },
        http: {
          externalUrl: { isInternalUrl: jest.fn().mockReturnValue(false) },
        },
        notifications: { toasts: { addDanger: jest.fn() } },
      },
    });
    const externalUrlState: PageAttachmentPersistedState = {
      type: 'mockType',
      url: {
        actionLabel: 'View in Dashboards',
        pathAndQuery: 'https://external.com/test/path?query=1',
        label: 'External Dashboard',
        iconType: 'link',
      },
    };

    render(<PageAttachmentChildren persistableStateAttachmentState={externalUrlState} />);

    const callout = screen.getByText('External URL detected');
    expect(callout).toBeInTheDocument();
  });
});
