/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { SavedPlaygroundRouterParameters, PlaygroundViewMode } from '../types';

export const useSavedPlaygroundParameters = () => {
  const { playgroundId, pageMode, viewMode } = useParams<SavedPlaygroundRouterParameters>();
  return {
    playgroundId,
    pageMode,
    viewMode: viewMode ?? PlaygroundViewMode.preview,
  };
};
