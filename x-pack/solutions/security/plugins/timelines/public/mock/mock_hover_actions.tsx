/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

export const mockHoverActions = {
  getAddToTimelineButton: () => (
    <span data-test-subj="test-add-to-timeline">{'Add To Timeline'}</span>
  ),
  getCopyButton: () => <span data-test-subj="test-copy-button">{'Copy button'}</span>,
  getFilterForValueButton: () => <span data-test-subj="test-filter-for">{'Filter button'}</span>,
  getFilterOutValueButton: () => (
    <span data-test-subj="test-filter-out">{'Filter out button'}</span>
  ),
};
