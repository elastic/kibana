/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutTitle } from './flyout_title';
import {
  TITLE_HEADER_ICON_TEST_ID,
  TITLE_HEADER_TEXT_TEST_ID,
  TITLE_LINK_ICON_TEST_ID,
} from './test_ids';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiIcon: ({
      type,
      color,
      'data-test-subj': dataTestSubj,
    }: {
      type: string;
      color?: string;
      'data-test-subj'?: string;
    }) => <span data-test-subj={dataTestSubj} data-icon-type={type} data-icon-color={color} />,
  };
});

const title = 'test title';
const TEST_ID = 'test';
const DEFAULT_TEST_ID = 'flyoutTitle';

describe('<FlyoutTitle />', () => {
  it('should render title and icon', () => {
    const { getByTestId, queryByTestId } = render(
      <FlyoutTitle title={title} iconType={'warning'} data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(TEST_ID))).toHaveTextContent(title);
    expect(getByTestId(TITLE_HEADER_ICON_TEST_ID(TEST_ID))).toBeInTheDocument();
    expect(queryByTestId(TITLE_LINK_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
  });

  it('should not render icon if iconType is not passed', () => {
    const { getByTestId, queryByTestId } = render(
      <FlyoutTitle title={title} data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(TEST_ID))).toBeInTheDocument();
    expect(queryByTestId(TITLE_HEADER_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
    expect(queryByTestId(TITLE_LINK_ICON_TEST_ID(TEST_ID))).not.toBeInTheDocument();
  });

  it('should render popout icon if title is a link', () => {
    const { getByTestId } = render(<FlyoutTitle title={title} isLink data-test-subj={TEST_ID} />);

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(TEST_ID))).toHaveTextContent(title);
    expect(getByTestId(TITLE_LINK_ICON_TEST_ID(TEST_ID))).toHaveAttribute(
      'data-icon-type',
      'external'
    );
  });

  it('should render both the title icon and popout icon when the title is a link with an icon', () => {
    const { getByTestId } = render(
      <FlyoutTitle title={title} iconType={'warning'} isLink data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TITLE_HEADER_ICON_TEST_ID(TEST_ID))).toHaveAttribute(
      'data-icon-type',
      'warning'
    );
    expect(getByTestId(TITLE_LINK_ICON_TEST_ID(TEST_ID))).toHaveAttribute(
      'data-icon-type',
      'external'
    );
  });

  it('should use the default test subject when one is not provided', () => {
    const { getByTestId, queryByTestId } = render(
      <FlyoutTitle title={title} iconType={'warning'} />
    );

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(DEFAULT_TEST_ID))).toHaveTextContent(title);
    expect(getByTestId(TITLE_HEADER_ICON_TEST_ID(DEFAULT_TEST_ID))).toHaveAttribute(
      'data-icon-type',
      'warning'
    );
    expect(queryByTestId(TITLE_LINK_ICON_TEST_ID(DEFAULT_TEST_ID))).not.toBeInTheDocument();
  });

  it('should pass iconColor to the title icon', () => {
    const { getByTestId } = render(
      <FlyoutTitle
        title={title}
        iconType={'warning'}
        iconColor={'primary'}
        data-test-subj={TEST_ID}
      />
    );

    expect(getByTestId(TITLE_HEADER_ICON_TEST_ID(TEST_ID))).toHaveAttribute(
      'data-icon-color',
      'primary'
    );
  });
});
