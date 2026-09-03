/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DocsLinksSection } from './docs_links_section';

const items = [
  {
    id: 'demo',
    title: 'Demo environment',
    description: 'Explore our live demo environment.',
    linkLabel: 'Explore demo',
    href: 'https://demo.elastic.co',
    icon: <span data-test-subj="demoIconStub" />,
    'data-test-subj': 'docsLinkDemo',
  },
  {
    id: 'forum',
    title: 'Elastic forum',
    description: 'Exchange thoughts about Elastic.',
    linkLabel: 'Discuss forum',
    href: 'https://discuss.elastic.co/',
    icon: <span />,
    'data-test-subj': 'docsLinkForum',
  },
];

describe('DocsLinksSection', () => {
  it('renders every item with its link', () => {
    render(<DocsLinksSection items={items} />);
    expect(screen.getByTestId('addDataDocsLinks')).toBeInTheDocument();
    expect(screen.getByText('Demo environment')).toBeInTheDocument();
    expect(screen.getByText('Exchange thoughts about Elastic.')).toBeInTheDocument();
    const demoLink = screen.getByTestId('docsLinkDemo');
    expect(demoLink).toHaveAttribute('href', 'https://demo.elastic.co');
    expect(demoLink).toHaveAttribute('target', '_blank');
  });

  it('names each item group by its title for assistive tech', () => {
    render(<DocsLinksSection items={items} />);
    expect(screen.getByRole('group', { name: 'Demo environment' })).toBeInTheDocument();
  });
});
