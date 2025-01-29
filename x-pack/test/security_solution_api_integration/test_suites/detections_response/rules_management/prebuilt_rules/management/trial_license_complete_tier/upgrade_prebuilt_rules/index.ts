/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import { deleteAllTimelines, deleteAllPrebuiltRuleAssets } from '../../../../../utils';
import { deleteAllRules } from '../../../../../../../../common/utils/security_solution';
import { upgradeAllRules } from './upgrade_all_rules';

export default (context: FtrProviderContext): void => {
  const es = context.getService('es');
  const supertest = context.getService('supertest');
  const log = context.getService('log');

  describe('@ess @serverless @skipInServerlessMKI upgrade prebuilt rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    upgradeAllRules(context);
  });
};
