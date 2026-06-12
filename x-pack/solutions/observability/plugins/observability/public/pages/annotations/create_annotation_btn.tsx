/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createHtmlPortalNode, OutPortal } from 'react-reverse-portal';

export const createAnnotationPortal = createHtmlPortalNode();

export function CreateAnnotationBtn() {
  return <OutPortal node={createAnnotationPortal} />;
}
