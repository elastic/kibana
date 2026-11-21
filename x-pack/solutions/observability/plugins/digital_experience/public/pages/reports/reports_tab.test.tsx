/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReportsTab } from './reports_tab';
import { REPORT_TEMPLATES } from './report_templates';

describe('ReportsTab', () => {
  it('lists a card for every report template, linking to its report', () => {
    render(<ReportsTab hrefs={{ scorecard: '/scorecard-href' }} />);

    REPORT_TEMPLATES.forEach(({ id, title }) => {
      const card = screen.getByTestId(`digitalExperienceReportCard-${id}`);
      expect(card).toHaveTextContent(title);
    });
    expect(screen.getByRole('link', { name: /Weekly scorecard/ })).toHaveAttribute(
      'href',
      '/scorecard-href'
    );
  });
});
