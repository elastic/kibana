/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigateTo, useGetAppUrl } from '@kbn/security-solution-navigation';
import {
  ADD_DATA_PATH,
  ADD_THREAT_INTELLIGENCE_DATA_PATH,
  SECURITY_FEATURE_ID,
  SecurityPageName,
} from '../../../common/constants';
import { isThreatIntelligencePath } from '../../helpers';

import { useKibana } from '../lib/kibana';
import { hasCapabilities } from '../lib/capabilities';

export const useAddIntegrationsUrl = () => {
  const {
    http: {
      basePath: { prepend },
    },
    application: { capabilities },
  } = useKibana().services;
  const { pathname } = useLocation();
  const { getAppUrl } = useGetAppUrl();
  const { navigateTo } = useNavigateTo();

  const isThreatIntelligence = isThreatIntelligencePath(pathname);
  const hasSearchAILakeAccess = hasCapabilities(capabilities, [
    [`${SECURITY_FEATURE_ID}.external_detections`],
  ]);

  const searchAILakeIntegrationsPath = getAppUrl({
    deepLinkId: SecurityPageName.configurationsIntegrations,
    path: 'browse',
  });

  const integrationsUrl = isThreatIntelligence
    ? ADD_THREAT_INTELLIGENCE_DATA_PATH
    : hasSearchAILakeAccess
    ? searchAILakeIntegrationsPath
    : ADD_DATA_PATH;

  const href = useMemo(() => prepend(integrationsUrl), [prepend, integrationsUrl]);

  const onClick = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      navigateTo({ url: href });
    },
    [href, navigateTo]
  );

  return {
    href,
    onClick,
  };
};
