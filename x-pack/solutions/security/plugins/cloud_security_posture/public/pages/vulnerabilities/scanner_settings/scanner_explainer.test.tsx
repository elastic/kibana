/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScannerExplainer } from './scanner_explainer';
import { SCANNER_SETTINGS_TEST_SUBJECTS } from './test_subjects';

describe('ScannerExplainer', () => {
  const renderText = () => {
    render(<ScannerExplainer />);
    return screen.getByTestId(SCANNER_SETTINGS_TEST_SUBJECTS.EXPLAINER).textContent ?? '';
  };

  it('names the platforms and feeds the scanner covers', () => {
    const text = renderText();

    expect(text).toContain('Ubuntu, RHEL 8 and later, and Windows');
    expect(text).toContain('Canonical, Red Hat and Microsoft');
    expect(text).toContain('Known Exploited Vulnerabilities');
  });

  it('does not claim Windows is unsupported', () => {
    const text = renderText();

    expect(text).not.toMatch(/does not cover[^.]*Windows/);
    expect(text).toContain(
      'does not match language packages and does not cover containers or macOS'
    );
  });
});
