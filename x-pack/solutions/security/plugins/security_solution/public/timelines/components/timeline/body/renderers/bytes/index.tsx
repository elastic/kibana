/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PreferenceFormattedBytes } from '../../../../../../common/components/formatted_bytes';

export const BYTES_FORMAT = 'bytes';

/**
 * Renders draggable text containing the value of a field representing a
 * duration of time, (e.g. `event.duration`)
 */
export const Bytes = React.memo<{
  value?: string | null;
}>(({ value }) => <PreferenceFormattedBytes value={`${value}`} />);

Bytes.displayName = 'Bytes';
