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

describe('PageAttachmentChildren', () => {
  const mockPersistableState: PageAttachmentPersistedState = {
    type: 'mockType',
    url: {
      actionLabel: 'View in Dashboards',
      pathAndQuery: '/test/path?query=1',
      label: 'Sample Dashboard',
      iconType: 'link',
    },
  };

  it('renders the link with correct label and href', () => {
    render(<PageAttachmentChildren persistableStateAttachmentState={mockPersistableState} />);

    const link = screen.getByRole('link', { name: 'Sample Dashboard' });
    expect(link).toHaveAttribute('href', '/test/path?query=1');
  });
});
