/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { FieldBrowser } from '@kbn/response-ops-alerts-fields-browser';
import { TestProvidersComponent } from '../../../../mocks/test_providers';
import { IndicatorsFieldBrowser } from './field_browser';

vi.mock('@kbn/response-ops-alerts-fields-browser', () => {
  const mocked = {
    FieldBrowser: vi.fn(() => <div data-test-subj="fieldBrowser" />),
  };
  return { ...mocked, default: mocked };
});

const stub = vi.fn();

describe('<IndicatorsFieldBrowser />', () => {
  it('should render the field browser widget with the correct props', () => {
    render(
      <IndicatorsFieldBrowser
        browserFields={{}}
        columnIds={[]}
        onResetColumns={stub}
        onToggleColumn={stub}
      />,
      {
        wrapper: TestProvidersComponent,
      }
    );

    expect(FieldBrowser).toHaveBeenCalledWith(
      expect.objectContaining({
        browserFields: {},
        columnIds: [],
        onResetColumns: stub,
        onToggleColumn: stub,
        options: {
          preselectedCategoryIds: ['threat', 'base', 'event', 'agent'],
        },
      }),
      expect.anything()
    );
  });
});
