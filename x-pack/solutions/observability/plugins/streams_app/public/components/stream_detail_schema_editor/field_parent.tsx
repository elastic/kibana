/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export const FieldParent = ({
  parent,
  linkEnabled = false,
}: {
  parent: string;
  linkEnabled?: boolean;
}) => {
  const router = useStreamsAppRouter();
  return linkEnabled ? (
    <EuiBadge
      color="hollow"
      href={router.link('/{key}/{tab}/{subtab}', {
        path: {
          key: parent,
          tab: 'management',
          subtab: 'schemaEditor',
        },
      })}
    >
      {parent}
    </EuiBadge>
  ) : (
    <EuiBadge color="hollow">{parent}</EuiBadge>
  );
};
