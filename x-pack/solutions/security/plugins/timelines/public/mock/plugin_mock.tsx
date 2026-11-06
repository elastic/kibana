/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAddToTimeline, useAddToTimelineSensor } from '../hooks/use_add_to_timeline';
import { mockHoverActions } from './mock_hover_actions';

export const createTGridMocks = () => ({
  getHoverActions: () => mockHoverActions,
  getUseAddToTimeline: () => useAddToTimeline,
  getUseAddToTimelineSensor: () => useAddToTimelineSensor,
});
