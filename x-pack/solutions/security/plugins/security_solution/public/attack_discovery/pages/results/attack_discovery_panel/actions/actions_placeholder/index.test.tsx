/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { ActionsPlaceholder } from '.';

describe('ActionsPlaceholder', () => {
  beforeEach(() => render(<ActionsPlaceholder />));

  const expectedSkeletonTitles = ['skeletonTitle1', 'skeletonTitle2', 'skeletonTitle3'];

  expectedSkeletonTitles.forEach((expectedSkeletonTitle) => {
    it(`renders the ${expectedSkeletonTitle} skeleton title`, () => {
      expect(screen.getByTestId(expectedSkeletonTitle)).toBeInTheDocument();
    });
  });
});
