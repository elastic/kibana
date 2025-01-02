/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { createHtmlPortalNode } from 'react-reverse-portal';

/**
 * A singleton portal for rendering content in the global header
 */
const globalKQLHeaderPortalNodeSingleton = createHtmlPortalNode();

export const useGlobalHeaderPortal = () => {
  const [globalKQLHeaderPortalNode] = useState(globalKQLHeaderPortalNodeSingleton);

  return { globalKQLHeaderPortalNode };
};
