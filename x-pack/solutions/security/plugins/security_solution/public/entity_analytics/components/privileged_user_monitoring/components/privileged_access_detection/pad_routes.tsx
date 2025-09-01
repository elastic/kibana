/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { API_VERSIONS } from '../../../../../../common/entity_analytics/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import type { GetPrivilegedAccessDetectionPackageStatusResponse } from '../../../../../../common/api/entity_analytics/privilege_monitoring/privileged_access_detection/status.gen';

const PRIVILEGED_ACCESS_DETECTION_INDEX_PATTERN =
  'logs-*,ml_okta_multiple_user_sessions_pad.all,ml_windows_privilege_type_pad.all';

export const usePrivilegedAccessDetectionRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    const getPrivilegedAccessDetectionStatus = async () => {
      return http.fetch<GetPrivilegedAccessDetectionPackageStatusResponse>(
        '/api/entity_analytics/privileged_user_monitoring/pad/status',
        {
          method: 'GET',
          version: API_VERSIONS.public.v1,
        }
      );
    };

    const installPrivilegedAccessDetectionPackage = async () => {
      return http.fetch('/api/entity_analytics/privileged_user_monitoring/pad/install', {
        method: 'POST',
        version: API_VERSIONS.public.v1,
      });
    };

    const setupPrivilegedAccessDetectionMlModule = async () => {
      return http.fetch('/internal/ml/modules/setup/pad-ml', {
        version: '1',
        method: 'POST',
        body: JSON.stringify({
          indexPatternName: PRIVILEGED_ACCESS_DETECTION_INDEX_PATTERN,
          useDedicatedIndex: false,
          startDatafeed: false,
        }),
      });
    };

    return {
      getPrivilegedAccessDetectionStatus,
      installPrivilegedAccessDetectionPackage,
      setupPrivilegedAccessDetectionMlModule,
    };
  }, [http]);
};
