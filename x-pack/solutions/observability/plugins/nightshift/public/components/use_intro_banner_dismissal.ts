/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '../hooks/use_kibana';

export interface IntroBannerDismissal {
  isDismissed: boolean;
  dismiss: () => void;
}

export const useIntroBannerDismissal = (): IntroBannerDismissal => {
  const { http } = useKibana().services;
  const [isDismissed = false, setIsDismissed] = useLocalStorage<boolean>(
    `nightshift.onboarding.introBannerDismissed:${http.basePath.get() || 'default'}`,
    false
  );
  return { isDismissed, dismiss: () => setIsDismissed(true) };
};
