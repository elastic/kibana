/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useMissingPrivileges } from '../../../common/hooks/use_missing_privileges';
import { MissingPrivilegesCallOut } from '../../../common/components/missing_privileges';

/**
 * Callout that displays a Callout when the user has missing detections privileges.
 */
export const MissingDetectionsPrivilegesCallOut = memo(() => {
  const missingPrivileges = useMissingPrivileges();

  return <MissingPrivilegesCallOut namespace="detections" missingPrivileges={missingPrivileges} />;
});

MissingDetectionsPrivilegesCallOut.displayName = 'MissingDetectionsPrivilegesCallOut';
