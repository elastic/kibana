/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import type { IndicesStatusResponse } from '../../../common';

import { useUserPrivilegesQuery } from '../../hooks/api/use_user_permissions';
import { useKibana } from '../../hooks/use_kibana';
import type { CreateIndexFormState } from '../../types';
import { generateRandomIndexName } from '../../utils/indices';
import { getDefaultCodingLanguage } from '../../utils/language';

import { CreateIndexPanel } from '../shared/create_index_panel/create_index_panel';

import { CreateIndexUIView } from './create_index_ui_view';

function initCreateIndexState() {
  const defaultIndexName = generateRandomIndexName();
  return {
    indexName: defaultIndexName,
    defaultIndexName,
    codingLanguage: getDefaultCodingLanguage(),
  };
}

interface CreateIndexProps {
  indicesData?: IndicesStatusResponse;
}

export const CreateIndex = ({ indicesData }: CreateIndexProps) => {
  const { application } = useKibana().services;
  const [formState, setFormState] = useState<CreateIndexFormState>(initCreateIndexState);
  const { data: userPrivileges } = useUserPrivilegesQuery(formState.defaultIndexName);

  const onClose = useCallback(() => {
    application.navigateToApp('elasticsearchIndexManagement');
  }, [application]);

  return (
    <CreateIndexPanel onClose={onClose}>
      <CreateIndexUIView
        formState={formState}
        setFormState={setFormState}
        userPrivileges={userPrivileges}
      />
    </CreateIndexPanel>
  );
};
