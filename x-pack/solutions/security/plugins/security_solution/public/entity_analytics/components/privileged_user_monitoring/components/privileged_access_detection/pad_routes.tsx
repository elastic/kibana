/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { API_VERSIONS } from '../../../../../../common/entity_analytics/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import type { GetPrivilegedAccessDetectionPackageStatusResponse } from '../../../../../../common/api/entity_analytics';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../../common/utils/execution_context';

const PAD_INSTALLATION_STATUS_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.PRIVILEGED_USER_MONITORING,
  'pad_installation_status'
);
const PAD_INSTALL_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.PRIVILEGED_USER_MONITORING,
  'pad_install'
);
const PAD_ML_MODULE_SETUP_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.PRIVILEGED_USER_MONITORING,
  'pad_ml_module_setup'
);

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
          context: PAD_INSTALLATION_STATUS_CONTEXT,
        }
      );
    };

    const installPrivilegedAccessDetectionPackage = async () => {
      return http.fetch('/api/entity_analytics/privileged_user_monitoring/pad/install', {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        context: PAD_INSTALL_CONTEXT,
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
        context: PAD_ML_MODULE_SETUP_CONTEXT,
      });
    };

    return {
      getPrivilegedAccessDetectionStatus,
      installPrivilegedAccessDetectionPackage,
      setupPrivilegedAccessDetectionMlModule,
    };
  }, [http]);
};
