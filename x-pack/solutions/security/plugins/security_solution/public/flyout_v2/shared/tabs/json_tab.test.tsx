/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  JsonTab,
  JSON_TAB_CONTENT_TEST_ID,
  JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID,
} from './json_tab';
import { FLYOUT_ERROR_TEST_ID } from '../components/test_ids';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

jest.mock('@kbn/unified-doc-viewer-plugin/public', () => ({
  JsonCodeEditor: () => <div data-test-subj="mockJsonCodeEditor" />,
}));

const TEST_SUBJ = 'test-prefix-';
const TEST_VALUE = { field: 'value', nested: { key: 123 } };

const renderJsonTab = (props?: Partial<React.ComponentProps<typeof JsonTab>>) =>
  render(
    <IntlProvider locale="en">
      <JsonTab value={TEST_VALUE} data-test-subj={TEST_SUBJ} {...props} />
    </IntlProvider>
  );

describe('<JsonTab />', () => {
  it('renders the json content container with the correct test id', () => {
    const { getByTestId } = renderJsonTab();

    expect(getByTestId(`${TEST_SUBJ}${JSON_TAB_CONTENT_TEST_ID}`)).toBeInTheDocument();
  });

  it('renders the copy to clipboard button with the correct test id', () => {
    const { getByTestId } = renderJsonTab();

    expect(
      getByTestId(`${TEST_SUBJ}${JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID}`)
    ).toBeInTheDocument();
  });

  it('renders the json code editor', () => {
    const { getByTestId } = renderJsonTab();

    expect(getByTestId('mockJsonCodeEditor')).toBeInTheDocument();
  });

  it('renders FlyoutError when isEmpty is true', () => {
    const { getByTestId, queryByTestId } = renderJsonTab({ isEmpty: true });

    expect(getByTestId(FLYOUT_ERROR_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(`${TEST_SUBJ}${JSON_TAB_CONTENT_TEST_ID}`)).not.toBeInTheDocument();
  });

  it('does not render FlyoutError when isEmpty is false', () => {
    const { queryByTestId } = renderJsonTab({ isEmpty: false });

    expect(queryByTestId(FLYOUT_ERROR_TEST_ID)).not.toBeInTheDocument();
  });
});
