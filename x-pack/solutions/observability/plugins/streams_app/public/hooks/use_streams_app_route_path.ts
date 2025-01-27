/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, useRoutePath } from '@kbn/typed-react-router-config';
import type { StreamsAppRoutes } from '../routes/config';

export function useStreamsAppRoutePath() {
  const path = useRoutePath();

  return path as PathsOf<StreamsAppRoutes>;
}
