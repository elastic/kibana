/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getGroupPanelTitle } from './get_group_panel_title';

describe('getGroupPanelTitle', () => {
  it('should return bucket key as string when no aggregationField is provided', () => {
    const bucket = {
      key_as_string: 'test-id',
      doc_count: 5,
    };
    
    const result = getGroupPanelTitle(bucket);
    
    // We can't compare React elements directly, but we can check the structure
    expect(result).toBeTruthy();
    expect(result.type).toBe('strong');
    expect(result.props.children).toBe('test-id');
  });

  it('should return "name - id" format when aggregationField is provided', () => {
    const bucket = {
      key_as_string: 'test-id',
      doc_count: 5,
      resourceName: {
        buckets: [{ key: 'test-name' }],
      },
    };
    
    const result = getGroupPanelTitle(bucket, 'resourceName');
    
    // We can't compare React elements directly, but we can check the structure
    expect(result).toBeTruthy();
    expect(result.type).toBe(React.Fragment);
    expect(result.props.children).toHaveLength(3);
  });

  it('should return just bucket key when aggregationField is provided but no data exists', () => {
    const bucket = {
      key_as_string: 'test-id',
      doc_count: 5,
      resourceName: {
        buckets: [],
      },
    };
    
    const result = getGroupPanelTitle(bucket, 'resourceName');
    
    expect(result).toBeTruthy();
    expect(result.type).toBe('strong');
    expect(result.props.children).toBe('test-id');
  });
});