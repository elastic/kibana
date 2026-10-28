/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../common/mock/endpoint';
import { ExceptionsListItemGenerator } from '../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { MAX_COMMENT_LENGTH } from '../../../../common/constants';
import { ArtifactFormComments, type ArtifactFormCommentsProps } from './artifact_form_comments';

describe('ArtifactFormComments', () => {
  const generator = new ExceptionsListItemGenerator('seed');

  let render: (
    props?: Partial<ArtifactFormCommentsProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let onChange: jest.Mock;
  let onErrorChange: jest.Mock;

  const getCommentInput = () => renderResult.getByLabelText('Comment Input');

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    onChange = jest.fn();
    onErrorChange = jest.fn();

    render = (props) => {
      renderResult = mockedContext.render(
        <ArtifactFormComments
          item={generator.generateForCreate()}
          onChange={onChange}
          onErrorChange={onErrorChange}
          data-test-subj="comments"
          {...props}
        />
      );
      return renderResult;
    };
  });

  it('lists the existing comments of a persisted artifact', () => {
    render({
      item: generator.generate({
        comments: [
          {
            id: 'comment-1',
            comment: 'Existing comment',
            created_at: '2025-12-01T10:00:00.000Z',
            created_by: 'jane.doe',
          },
        ],
      }),
    });

    expect(renderResult.getByTestId('comments')).toHaveTextContent('Existing comment');
    expect(renderResult.getByTestId('comments')).toHaveTextContent('Show (1) Comment');
  });

  it('sends only the new comment when typing', () => {
    render({
      item: generator.generate({
        comments: [
          {
            id: 'comment-1',
            comment: 'Existing comment',
            created_at: '2025-12-01T10:00:00.000Z',
            created_by: 'jane.doe',
          },
        ],
      }),
    });

    fireEvent.change(getCommentInput(), { target: { value: 'New comment' } });

    expect(getCommentInput()).toHaveValue('New comment');
    expect(onChange).toHaveBeenLastCalledWith([{ comment: 'New comment' }]);
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
  ])('sends no comments when the new comment is %s', (_, value) => {
    render();

    fireEvent.change(getCommentInput(), { target: { value: 'something' } });
    fireEvent.change(getCommentInput(), { target: { value } });

    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('disables the comment input when isDisabled is true', () => {
    render({ isDisabled: true });

    expect(getCommentInput()).toBeDisabled();
  });

  it('reports an error when the new comment is too long', () => {
    render();

    fireEvent.change(getCommentInput(), {
      target: { value: 'a'.repeat(MAX_COMMENT_LENGTH + 1) },
    });

    expect(onErrorChange).toHaveBeenLastCalledWith(true);
  });
});
