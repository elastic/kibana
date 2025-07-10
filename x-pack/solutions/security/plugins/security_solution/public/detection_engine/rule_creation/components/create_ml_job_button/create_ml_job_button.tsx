/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { useMlManagementHref, ML_PAGES } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

export function CreateCustomMlJobButton(): JSX.Element {
  const {
    services: { ml },
  } = useKibana();
  const mlADLink = useMlManagementHref(ml, {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  });

  return (
    <EuiButton iconType="popout" iconSide="right" href={mlADLink}>
      {i18n.CREATE_CUSTOM_JOB_BUTTON_TITLE}
    </EuiButton>
  );
}
