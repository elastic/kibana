/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpLogic } from '../../shared/http';
import { KibanaLogic } from '../../shared/kibana';
import { createHref } from '../../shared/react_router_helpers';

export const getEnterpriseSearchContentUrl = (path: string): string =>
  createHref(path, {
    history: KibanaLogic.values.history,
    http: HttpLogic.values.http,
  });
