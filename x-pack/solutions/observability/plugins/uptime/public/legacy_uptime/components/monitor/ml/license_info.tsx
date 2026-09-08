/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { useDispatch } from 'react-redux-v7';
import { UptimeSettingsContext } from '../../../contexts';
import * as labels from './translations';
import { getMLCapabilitiesAction } from '../../../state/actions';

export const ShowLicenseInfo = () => {
  const { basePath } = useContext(UptimeSettingsContext);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getMLCapabilitiesAction.get());
  }, [dispatch]);

  return (
    <>
      <KbnInfoCallout
        data-test-subj="uptimeMLLicenseInfo"
        className="license-info-trial"
        title={labels.START_TRAIL}
        text={labels.START_TRAIL_DESC}
        actionProps={{
          primary: {
            'data-test-subj': 'syntheticsShowLicenseInfoButton',
            href: basePath + `/app/management/stack/license_management/home`,
            children: labels.START_TRAIL,
          },
        }}
      />
      <EuiSpacer />
    </>
  );
};
