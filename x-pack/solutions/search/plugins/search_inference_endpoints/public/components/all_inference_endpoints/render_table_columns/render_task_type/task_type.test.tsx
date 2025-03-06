/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { TaskType } from './task_type';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

describe('TaskType component', () => {
  it.each([
    ['completion' as InferenceTaskType, 'completion'],
    ['sparse_embedding' as InferenceTaskType, 'sparse_embedding'],
    ['text_embedding' as InferenceTaskType, 'text_embedding'],
  ])('renders the task type badge for %s', (taskType, expected) => {
    render(<TaskType type={taskType} />);
    const badge = screen.getByTestId(`table-column-task-type-${taskType}`);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(expected);
  });

  it('returns null when type is null', () => {
    const { container } = render(<TaskType />);
    expect(container).toBeEmptyDOMElement();
  });
});
