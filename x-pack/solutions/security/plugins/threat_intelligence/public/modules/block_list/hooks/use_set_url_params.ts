/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSecurityContext } from '../../../hooks/use_security_context';

/**
 * Retrieve the useSetUrlParams hook from SecurityContext.
 * The hook is passed down from the Security Solution plugin.
 */
export const useSetUrlParams = () => {
  const { blockList } = useSecurityContext();
  return { setUrlParams: blockList.useSetUrlParams() };
};
