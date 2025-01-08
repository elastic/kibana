/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { Index } from '@kbn/index-management-shared-types';
import React from 'react';
import { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import type { UserStartPrivilegesResponse } from '../../../common';

export interface SearchIndexDetailsMappingsProps {
  index?: Index;
  userPrivileges?: UserStartPrivilegesResponse;
}
export const SearchIndexDetailsMappings = ({
  index,
  userPrivileges,
}: SearchIndexDetailsMappingsProps) => {
  const { indexManagement, history } = useKibana().services;

  const IndexMappingComponent = useMemo(
    () => indexManagement.getIndexMappingComponent({ history }),
    [indexManagement, history]
  );

  const hasUpdateMappingsPrivilege = useMemo(() => {
    return userPrivileges?.privileges.canManageIndex === true;
  }, [userPrivileges]);

  return (
    <>
      <EuiSpacer />
      <IndexMappingComponent
        index={index}
        showAboutMappings={false}
        hasUpdateMappingsPrivilege={hasUpdateMappingsPrivilege}
      />
    </>
  );
};
