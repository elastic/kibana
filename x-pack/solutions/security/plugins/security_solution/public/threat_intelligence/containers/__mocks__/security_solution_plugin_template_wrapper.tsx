/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EMPTY_PAGE_SECURITY_TEMPLATE } from '../../mocks/test_providers';

export const SecuritySolutionPluginTemplateWrapper = (props: {
  children?: ReactNode;
  emptyPageBody: ReactNode;
  isEmptyState: boolean;
}) => (
  <div data-test-subj={EMPTY_PAGE_SECURITY_TEMPLATE}>
    {props.isEmptyState ? props.emptyPageBody : props.children}
  </div>
);
