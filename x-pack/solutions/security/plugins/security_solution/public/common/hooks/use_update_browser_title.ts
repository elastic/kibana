/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useRouteSpy } from '../utils/route/use_route_spy';
import { useLinkInfo } from '../links/links_hooks';

const SECURITY = i18n.translate('xpack.securitySolution.browserTitle.security', {
  defaultMessage: 'Security',
});

export const useUpdateBrowserTitle = () => {
  const [{ pageName }] = useRouteSpy();
  const linkInfo = useLinkInfo(pageName);

  useEffect(() => {
    document.title = `${linkInfo?.title ?? SECURITY} - Kibana`;
  }, [linkInfo]);
};
