/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useMemo } from 'react';
import moment from 'moment';
import { useKibana } from './use_kibana';

export const useGetLicenseInfo = () => {
  const {
    services: { licensing },
  } = useKibana();

  const license = useObservable(licensing.license$, null);

  const { isTrial, daysLeft } = useMemo(() => {
    return {
      isTrial: license && license.isAvailable && license.isActive && license.type === 'trial',
      daysLeft:
        (license &&
          license.isAvailable &&
          license.isActive &&
          license.expiryDateInMillis &&
          moment(license.expiryDateInMillis).days()) ||
        0,
    };
  }, [license]);

  return {
    isTrial,
    daysLeft,
  };
};
