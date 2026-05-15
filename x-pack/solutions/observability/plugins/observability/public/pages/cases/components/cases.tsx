/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CasesPermissions } from '@kbn/cases-plugin/common';
import { observabilityFeatureId } from '../../../../common';
import { useKibana } from '../../../utils/kibana_react';
import { CASES_PATH } from '../../../../common/locators/paths';

export interface CasesProps {
  permissions: CasesPermissions;
}

export function Cases({ permissions }: CasesProps) {
  const { cases } = useKibana().services;

  if (!cases) {
    return (
      <>
        {i18n.translate('xpack.observability.cases.casesPluginIsNotLabel', {
          defaultMessage:
            'Cases plugin is not available. Please ensure it is installed and enabled.',
        })}
      </>
    );
  }

  const CasesList = cases.ui.getCases;

  return (
    <>
      <CasesList
        basePath={CASES_PATH}
        features={{
          alerts: { sync: false, isExperimental: false },
          observables: { enabled: false },
          events: { enabled: false },
        }}
        owner={[observabilityFeatureId]}
        permissions={permissions}
      />
    </>
  );
}
