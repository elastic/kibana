/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { SIEM_VERSIONS } from '../../common/constants';
import { createRbacEmptyStateSuite } from './rbac_empty_state_test_suite';

describe(
  'Endpoints page RBAC - neither Defend policy nor hosts are present (siem v5)',
  { tags: ['@ess'] },
  () => {
    it('latest siem version should be in version list', () => {
      expect(SIEM_VERSIONS.at(-1)).to.equal(SECURITY_FEATURE_ID);
    });
    createRbacEmptyStateSuite('siemV5');
  }
);
