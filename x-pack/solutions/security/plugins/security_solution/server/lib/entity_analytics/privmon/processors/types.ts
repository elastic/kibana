/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PrivilegedUserDoc,
  PrivilegedUserObservation,
} from '../../../../../common/api/entity_analytics/privmon';

export interface ProcessorResult {
  privilegedUsers: PrivilegedUserDoc[];
}

export interface UserAndObservations {
  observations: PrivilegedUserObservation[];
  user: PrivilegedUserDoc['user'];
}
