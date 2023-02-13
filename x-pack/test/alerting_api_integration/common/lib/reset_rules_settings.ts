/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import { Superuser } from '../../security_and_spaces/scenarios';
import { getUrlPrefix } from './space_test_utils';

export const resetRulesSettings = (supertest: any, space: string) => {
  return supertest
    .post(`${getUrlPrefix(space)}/internal/alerting/rules/settings/_flapping`)
    .set('kbn-xsrf', 'foo')
    .auth(Superuser.username, Superuser.password)
    .send({
      enabled: DEFAULT_FLAPPING_SETTINGS.enabled,
      look_back_window: DEFAULT_FLAPPING_SETTINGS.lookBackWindow,
      status_change_threshold: DEFAULT_FLAPPING_SETTINGS.statusChangeThreshold,
    })
    .expect(200);
};
