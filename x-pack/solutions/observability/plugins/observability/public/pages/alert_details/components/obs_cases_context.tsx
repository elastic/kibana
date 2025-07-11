/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../../../utils/kibana_react';
import { observabilityFeatureId } from '../../../../common';

export const ObsCasesContext: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { services } = useKibana();
  const { cases } = services;
  const userCasesPermissions = cases?.helpers.canUseCases([observabilityFeatureId]);
  const CasesContext = cases?.ui.getCasesContext();

  if (userCasesPermissions && CasesContext) {
    return (
      <CasesContext
        owner={[observabilityFeatureId]}
        permissions={userCasesPermissions}
        features={{ alerts: { sync: false } }}
      >
        {children}
      </CasesContext>
    );
  } else {
    return <>{children}</>;
  }
};
