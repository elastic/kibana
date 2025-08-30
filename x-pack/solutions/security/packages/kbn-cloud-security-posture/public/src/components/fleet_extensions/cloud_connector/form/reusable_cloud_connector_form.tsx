/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AWSReusableConnectorForm } from '../aws_cloud_connector/aws_reusable_connector_form';
import type { CloudConnectorCredentials } from '../hooks/use_cloud_connector_setup';

export const ReusableCloudConnectorForm: React.FC<{
  credentials: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
}> = ({ credentials, setCredentials }) => {
  // Default to AWS for now
  return <AWSReusableConnectorForm credentials={credentials} setCredentials={setCredentials} />;
};
