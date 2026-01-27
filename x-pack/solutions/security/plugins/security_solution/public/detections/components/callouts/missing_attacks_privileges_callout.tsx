/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { MissingPrivilegesCallOut } from '../../../common/components/missing_privileges';
import {
  type MissingIndexPrivileges,
  type MissingPrivileges,
  useMissingPrivileges,
} from '../../../common/hooks/use_missing_privileges';
import { useGetMissingIndexPrivileges } from '../../../attack_discovery/pages/use_get_missing_index_privileges';

export const MissingAttacksPrivilegesCallOut = React.memo(() => {
  const missingDetectionsPrivileges = useMissingPrivileges();
  const { data: missingIndexPrivileges = [] } = useGetMissingIndexPrivileges();

  const missingPrivileges: MissingPrivileges = useMemo(() => {
    return {
      featurePrivileges: missingDetectionsPrivileges.featurePrivileges,
      indexPrivileges: [
        ...missingDetectionsPrivileges.indexPrivileges,

        // include missing attack discovery index privileges
        ...missingIndexPrivileges.map<MissingIndexPrivileges>(
          ({ index_name: indexName, privileges }) => [indexName, privileges]
        ),
      ],
    };
  }, [missingDetectionsPrivileges, missingIndexPrivileges]);

  return <MissingPrivilegesCallOut namespace="attacks" missingPrivileges={missingPrivileges} />;
});
MissingAttacksPrivilegesCallOut.displayName = 'MissingAttacksPrivilegesCallOut';
