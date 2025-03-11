/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConfigFields } from './config_fields';
import type { ArrayItem } from '../../../shared_imports';
import { CommentField } from './comment_field';
import { ActionTypeField } from './action_type_field';
import { EndpointActionCallout } from './callout';

interface EndpointResponseActionProps {
  item: ArrayItem;
  editDisabled: boolean;
}

export const EndpointResponseAction = React.memo((props: EndpointResponseActionProps) => {
  const paramsPath = `${props.item.path}.params`;

  return (
    <>
      <ActionTypeField
        basePath={paramsPath}
        disabled={props.editDisabled}
        readDefaultValueOnForm={!props.item.isNew}
      />

      <EndpointActionCallout basePath={paramsPath} editDisabled={props.editDisabled} />

      <ConfigFields
        basePath={paramsPath}
        disabled={props.editDisabled}
        readDefaultValueOnForm={!props.item.isNew}
      />

      <CommentField
        basePath={paramsPath}
        disabled={props.editDisabled}
        readDefaultValueOnForm={!props.item.isNew}
      />
    </>
  );
});
EndpointResponseAction.displayName = 'EndpointResponseAction';
