/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils';
import { JsonTab } from './json_tab';
import {
  JSON_TAB_CONTENT_TEST_ID,
  JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID,
} from '../../../shared/components/json_tab';
import { PREFIX } from '../../../../flyout/shared/test_ids';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

const hit = buildDataTableRecord({
  _id: '1',
  _index: 'index',
  _source: { some_field: 'some_value' },
} as EsHitRecord);

const renderJsonTab = () =>
  render(
    <IntlProvider locale="en">
      <JsonTab hit={hit} />
    </IntlProvider>
  );

describe('<JsonTab />', () => {
  it('should render json code editor component', () => {
    const { getByTestId } = renderJsonTab();

    expect(getByTestId(PREFIX + JSON_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should copy to clipboard', () => {
    const { getByTestId } = renderJsonTab();

    const copyToClipboardButton = getByTestId(PREFIX + JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID);
    expect(copyToClipboardButton).toBeInTheDocument();
  });
});
