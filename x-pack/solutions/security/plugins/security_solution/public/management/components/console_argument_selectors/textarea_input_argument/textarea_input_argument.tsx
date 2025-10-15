/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import type { CommandArgumentValueSelectorProps } from '../../console/types';

/**
 * Console argument component that displays a popup textarea for user to enter free-form data.
 */
export const TextareaInputArgument = memo<
  CommandArgumentValueSelectorProps<unknown, unknown, EndpointCommandDefinitionMeta>
>((props) => {
  return <div>{'TextareaInput placeholder'}</div>;
});
TextareaInputArgument.displayName = 'TextareaInputArgument';
