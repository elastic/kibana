/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectPanels, useSelector } from '../store/redux';

/**
 * This hook allows you to access the flyout state, read open right, left and preview panels.
 */
export const useFlyoutState = () => {
  return useSelector(selectPanels);
};
