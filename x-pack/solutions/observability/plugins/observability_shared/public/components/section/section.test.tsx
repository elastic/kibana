/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Section, SectionLink, SectionLinks, SectionTitle } from './section';

describe('Section', () => {
  it('renders SectionTitle as a non-heading label for its links list', () => {
    render(
      <Section>
        <SectionTitle id="sectionTitle">Host details</SectionTitle>
        <SectionLinks aria-labelledby="sectionTitle">
          <SectionLink label="Open in Logs" href="/app/logs" />
        </SectionLinks>
      </Section>
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Host details' })).toContainElement(
      screen.getByRole('link', { name: 'Open in Logs' })
    );
  });
});
