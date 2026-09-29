/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';
import { IndicatorBarchartLegendAction } from './legend_action';
import { timestampToIsoString } from './utils';

vi.mock('./utils');

const announceFn = vi.fn();

describe('IndicatorBarchartLegendAction', () => {
  const mockDate = '14182940000';

  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should formate group name if it is a date type', () => {
    const mockField = {
      label: '@timestamp',
      value: 'date',
    };
    render(
      <IndicatorBarchartLegendAction
        announceIndicatorActionChange={announceFn}
        data={mockDate}
        field={mockField}
      />
    );
    expect(vi.mocked(timestampToIsoString)).toHaveBeenCalled();
  });

  it('should render group name without formation', () => {
    const mockField = {
      label: 'host.name',
      value: 'string',
    };
    render(
      <IndicatorBarchartLegendAction
        announceIndicatorActionChange={announceFn}
        data={mockDate}
        field={mockField}
      />
    );
    expect(vi.mocked(timestampToIsoString)).not.toHaveBeenCalled();
  });
});
