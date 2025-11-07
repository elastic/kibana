/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';

import { useLicense } from '../../common/hooks/use_license';
import { Paywall } from '../components/paywall';
import { SecuritySolutionTemplateWrapper } from '../../app/home/template_wrapper';

export const EnterpriseGuard = memo<PropsWithChildren<unknown>>(({ children }) => {
  const licenseService = useLicense();

  if (licenseService.isEnterprise()) {
    return <>{children}</>;
  }

  return <SecuritySolutionTemplateWrapper isEmptyState emptyPageBody={<Paywall />} />;
});

EnterpriseGuard.displayName = 'EnterpriseGuard';
