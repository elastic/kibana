/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { mockGetFormattedComments } from '../../mocks/comments.mock';
import { ExceptionItemCardComments } from '.';
import * as i18n from '../translations';

const comments = mockGetFormattedComments();
describe('ExceptionItemCardComments', () => {
  it('should not render comments when the length is falsy', () => {
    const wrapper = render(
      <ExceptionItemCardComments comments={[]} dataTestSubj="ExceptionItemCardCommentsContainer" />
    );
    expect(wrapper.container).toMatchSnapshot();

    expect(wrapper.queryByTestId('ExceptionItemCardCommentsContainer')).not.toBeInTheDocument();
  });

  it('should render comments panel closed', () => {
    const wrapper = render(
      <ExceptionItemCardComments
        comments={comments}
        dataTestSubj="ExceptionItemCardCommentsContainer"
      />
    );
    expect(wrapper.container).toMatchSnapshot();

    expect(wrapper.getByTestId('ExceptionItemCardCommentsContainer')).toHaveTextContent(
      i18n.exceptionItemCardCommentsAccordion(comments.length)
    );
    expect(wrapper.getByTestId('accordionContentPanel')).not.toBeVisible();
  });

  it('should render comments panel opened when accordion is clicked', () => {
    const wrapper = render(
      <ExceptionItemCardComments
        comments={comments}
        dataTestSubj="ExceptionItemCardCommentsContainer"
      />
    );

    const container = wrapper.getByTestId('ExceptionItemCardCommentsContainerTextButton');
    fireEvent.click(container);
    expect(wrapper.getByTestId('accordionContentPanel')).toBeVisible();
    expect(wrapper.getByTestId('accordionCommentList')).toBeVisible();
    expect(wrapper.getByTestId('accordionCommentList')).toHaveTextContent('some old comment');
    expect(wrapper.container).toMatchSnapshot();
  });
});
