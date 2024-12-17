/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { inputsActions } from '../../store/actions';

export type SetQuery = Pick<
  Parameters<typeof inputsActions.setQuery>[0],
  'id' | 'inspect' | 'loading' | 'refetch' | 'searchSessionId'
>;

export type DeleteQuery = Pick<Parameters<typeof inputsActions.deleteOneQuery>[0], 'id'>;
