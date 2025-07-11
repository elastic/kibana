/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// React is needed for JSX in the tests
import { render } from '@testing-library/react';
import { RawBucket } from '@kbn/grouping/src';
import { getGroupPanelTitle } from './get_group_panel_title';

describe('getGroupPanelTitle', () => {
  it('should display bucket key as string when no aggregationField is provided', () => {
    const bucket = {
      key_as_string: 'test-id',
      doc_count: 5,
    };

    const title = getGroupPanelTitle(
      bucket as RawBucket<{ key_as_string: string; doc_count: number }>
    );

    const { container } = render(title);

    expect(container.textContent).toBe('test-id');
    expect(container.querySelector('strong')).not.toBeNull();
  });

  it('should display "name - id" format when aggregationField is provided', () => {
    const bucket = {
      key_as_string: 'test-id',
      doc_count: 5,
      resourceName: {
        buckets: [{ key: 'test-name' }],
      },
    };

    const title = getGroupPanelTitle(
      bucket as RawBucket<{
        key_as_string: string;
        doc_count: number;
        resourceName: { buckets: Array<{ key: string }> };
      }>,
      'resourceName'
    );

    const { container } = render(title);

    expect(container.textContent).toBe('test-name - test-id');

    const strongElement = container.querySelector('strong');
    expect(strongElement).not.toBeNull();
    expect(strongElement?.textContent).toBe('test-name');
  });

  it('should display just bucket key when aggregationField is provided but no data exists', () => {
    const bucket = {
      key_as_string: 'test-id',
      doc_count: 5,
      resourceName: {
        buckets: [],
      },
    };

    const title = getGroupPanelTitle(
      bucket as unknown as RawBucket<{
        key_as_string: string;
        doc_count: number;
        resourceName: { buckets: Array<{ key: string }> };
      }>,
      'resourceName'
    );

    const { container } = render(title);

    expect(container.textContent).toBe('test-id');
    expect(container.textContent).not.toContain(' - ');

    const strongElement = container.querySelector('strong');
    expect(strongElement).not.toBeNull();
    expect(strongElement?.textContent).toBe('test-id');
  });
});
