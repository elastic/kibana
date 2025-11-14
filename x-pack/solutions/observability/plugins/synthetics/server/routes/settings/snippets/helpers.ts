/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SyntheticsSnippetsService,
  syntheticsSnippetType,
} from '../../../saved_objects/synthetics_snippet';
import type { SyntheticsServerSetup, UptimeRequestHandlerContext } from '../../../types';

export const buildSnippetsService = async ({
  context,
  server,
}: {
  context: UptimeRequestHandlerContext;
  server: SyntheticsServerSetup;
}) => {
  const soClient = (await context.core).savedObjects.getClient({
    includedHiddenTypes: [syntheticsSnippetType.name],
  });
  return new SyntheticsSnippetsService(soClient, server.logger);
};
