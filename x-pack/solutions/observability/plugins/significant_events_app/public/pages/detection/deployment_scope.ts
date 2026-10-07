/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Uses the data stream namespace to identify a deployment without relying on inferred KI names. */
export const getStreamDeployment = (stream: string): string => {
  const lastSeparator = stream.lastIndexOf('-');
  return lastSeparator > stream.indexOf('-') ? stream.slice(lastSeparator + 1) : '';
};
