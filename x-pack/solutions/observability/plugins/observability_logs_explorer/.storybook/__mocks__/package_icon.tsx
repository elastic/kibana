/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon } from '@elastic/eui';

// Export mock package icon that doesn't trigger http requests
export const PackageIcon = () => <EuiIcon type="package" style={{ marginRight: 8 }} />;
