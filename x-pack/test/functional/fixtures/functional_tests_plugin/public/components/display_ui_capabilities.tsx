/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { uiCapabilities } from 'ui/capabilities';

export const DisplayUICapabilities = () => {
  return <pre data-test-subj="ui-capabilities">{JSON.stringify(uiCapabilities, null, 2)}</pre>;
};
