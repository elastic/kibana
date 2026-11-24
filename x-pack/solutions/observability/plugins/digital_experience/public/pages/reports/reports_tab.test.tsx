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
  it('lists a card for every report template', () => {
    render(<ReportsTab />);

    REPORT_TEMPLATES.forEach(({ id, title }) => {
      expect(screen.getByTestId(`digitalExperienceReportCard-${id}`)).toHaveTextContent(title);
    });
  });

  it('marks a template that is not available yet', () => {
    render(<ReportsTab />);

    expect(screen.getByTestId('digitalExperienceReportCard-scorecard')).toHaveTextContent(
      'Coming soon'
    );
  });
});
