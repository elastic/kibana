/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializer } from '../../../../../../../src/core/server';
import { initRoutes } from './init_routes';
import {
  SecurityPluginSetup,
  SecurityPluginStart,
} from '../../../../../../plugins/security/server';

export const plugin: PluginInitializer<
  void,
  void,
  { security: SecurityPluginSetup },
  { security: SecurityPluginStart }
> = () => {
  return {
    setup: (core: CoreSetup<{ security: SecurityPluginStart }>, { security }) => {
      initRoutes(core, security.session.userData.registerScope('xpack.sessionUserDataPlugin'));
    },
    start: () => {},
    stop: () => {},
  };
};
