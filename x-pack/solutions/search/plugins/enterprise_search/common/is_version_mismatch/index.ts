/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isVersionMismatch = (enterpriseSearchVersion?: string, kibanaVersion?: string) => {
  // Don't consider it a mismatch unless we know for certain it is
  if (!enterpriseSearchVersion || !kibanaVersion) return false;
  const [enterpriseSearchMajor, enterpriseSearchMinor] = enterpriseSearchVersion.split('.');
  const [kibanaMajor, kibanaMinor] = kibanaVersion.split('.');
  if (enterpriseSearchMajor !== kibanaMajor || enterpriseSearchMinor !== kibanaMinor) return true;
  return false;
};
