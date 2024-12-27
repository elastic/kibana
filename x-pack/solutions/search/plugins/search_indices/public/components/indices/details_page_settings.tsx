/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import type { UserStartPrivilegesResponse } from '../../../common';

interface SearchIndexDetailsSettingsProps {
  indexName: string;
  userPrivileges?: UserStartPrivilegesResponse;
}
export const SearchIndexDetailsSettings = ({
  indexName,
  userPrivileges,
}: SearchIndexDetailsSettingsProps) => {
  const { indexManagement, history } = useKibana().services;

  const hasUpdateSettingsPrivilege = useMemo(() => {
    return userPrivileges?.privileges.canManageIndex === true;
  }, [userPrivileges]);

  const IndexSettingsComponent = useMemo(
    () => indexManagement.getIndexSettingsComponent({ history }),
    [indexManagement, history]
  );

  return (
    <>
      <EuiSpacer />
      <IndexSettingsComponent
        indexName={indexName}
        hasUpdateSettingsPrivilege={hasUpdateSettingsPrivilege}
      />
    </>
  );
};
