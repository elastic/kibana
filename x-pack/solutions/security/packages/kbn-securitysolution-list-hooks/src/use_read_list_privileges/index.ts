/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readListPrivileges } from '@kbn/securitysolution-list-api';
import { useAsync, withOptionalSignal } from '@kbn/securitysolution-hook-utils';

const readListPrivilegesWithOptionalSignal = withOptionalSignal(readListPrivileges);

export const useReadListPrivileges = () => useAsync(readListPrivilegesWithOptionalSignal);
