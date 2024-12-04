/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useParams } from 'react-router-dom';

import { useActions } from 'kea';

import { EuiButton } from '@elastic/eui';

import { DELETE_BUTTON_LABEL } from '../../../../shared/constants';
import { DELETE_CONFIRMATION_MESSAGE } from '../constants';

import { CurationLogic } from '.';

export const DeleteCurationButton: React.FC = () => {
  const { curationId } = useParams() as { curationId: string };
  const { deleteCuration } = useActions(CurationLogic({ curationId }));

  return (
    <EuiButton
      color="danger"
      iconType="trash"
      onClick={() => {
        if (window.confirm(DELETE_CONFIRMATION_MESSAGE)) deleteCuration();
      }}
    >
      {DELETE_BUTTON_LABEL}
    </EuiButton>
  );
};
