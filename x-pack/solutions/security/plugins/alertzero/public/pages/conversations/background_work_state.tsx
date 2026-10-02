/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingChart } from '@elastic/eui';
import { BACKGROUND_WORK_BODY, BACKGROUND_WORK_TITLE } from './translations';

/** Shown while workers run and there is nothing to review: no open proposals, none closed in the window. */
export const BackgroundWorkState: React.FC = () => (
  <EuiEmptyPrompt
    data-test-subj="alertzeroBackgroundWorkState"
    icon={<EuiLoadingChart size="xl" />}
    title={<h2>{BACKGROUND_WORK_TITLE}</h2>}
    body={<p>{BACKGROUND_WORK_BODY}</p>}
  />
);
