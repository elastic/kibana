/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { getCases } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/api/case';
import { waitFor } from '../../../../common/utils/security_solution/detections_response';

export const waitForCases = async (supertest: SuperTest.Agent, log: ToolingLog): Promise<void> => {
  await waitFor(
    async () => {
      const response = await getCases(supertest);
      const cases = response;
      return cases != null && cases.cases.length > 0 && cases?.cases[0]?.totalAlerts > 0;
    },
    'waitForCaseToAttachAlert',
    log
  );
};
