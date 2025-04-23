/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import type { UpdatePrivMonUserRequestBody } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/update.gen';

export const fromRequestBody = (user: UpdatePrivMonUserRequestBody): Partial<MonitoredUserDoc> => ({
  user: { name: user.user_name },
  labels: { monitoring: { privileged_users: user.is_monitored ? 'monitored' : undefined } },
});
