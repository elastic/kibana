/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { DataActionButton } from './data_action_button';
import { ViewCodeAction } from './view_code/view_code_action';
import { PlaygroundPageMode } from '../types';
import { UploadFileButton } from './upload_file_button';

export const Toolbar: React.FC<{ selectedPageMode: PlaygroundPageMode }> = ({
  selectedPageMode = PlaygroundPageMode.chat,
}) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="playground-header-actions">
      <DataActionButton />
      <UploadFileButton />
      <ViewCodeAction selectedPageMode={selectedPageMode} />
    </EuiFlexGroup>
  );
};
