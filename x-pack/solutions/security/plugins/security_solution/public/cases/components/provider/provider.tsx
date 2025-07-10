/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';

interface Props {
  children: React.ReactNode;
}
export const CaseProvider: React.FC<Props> = ({ children }) => {
  const { cases } = useKibana().services;
  const CasesContext = cases.ui.getCasesContext();
  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);

  return (
    <CasesContext owner={[APP_ID]} permissions={userCasesPermissions}>
      {children}
    </CasesContext>
  );
};
