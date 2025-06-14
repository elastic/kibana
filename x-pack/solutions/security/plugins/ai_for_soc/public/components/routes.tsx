/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { FC } from 'react';
import React, { memo } from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { StartServices } from '../types';

interface RouterProps {
  children: React.ReactNode;
  history: History;
  services: StartServices;
}

const PageRouterComponent: FC<RouterProps> = ({ children, history, services }) => {
  const { cases } = services;
  const CasesContext = cases.ui.getCasesContext();
  const userCasesPermissions = cases.helpers.canUseCases(['securitySolution']);

  console.log('children', children);
  return (
    <Router history={history}>
      <Routes>
        <Route path="/">
          <CasesContext owner={['securitySolution']} permissions={userCasesPermissions}>
            <>{children}</>
          </CasesContext>
        </Route>
      </Routes>
    </Router>
  );
};

export const PageRouter = memo(PageRouterComponent);
