/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationType } from '../../common/types/applications';
import { useQueryParam } from './use_query_param';

/** The applications list's tab, `undefined` until one is picked. */
export const useApplicationType = (): {
  applicationType: ApplicationType | undefined;
  setApplicationType: (applicationType: ApplicationType | undefined) => void;
} => {
  const { value: applicationType, setValue: setApplicationType } = useQueryParam('applicationType');
  return { applicationType, setApplicationType };
};
