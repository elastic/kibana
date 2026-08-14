/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FaceliftVersion } from './active_version';
import {
  FaceliftHome as FaceliftHomeV1,
  FaceliftPageDescription as FaceliftPageDescriptionV1,
  type FaceliftHomeProps,
} from './v1/facelift_home';
import {
  FaceliftHome as FaceliftHomeV2,
  FaceliftPageDescription as FaceliftPageDescriptionV2,
} from './v2/facelift_home';

export type { FaceliftHomeProps };

export const FaceliftPageDescription: React.FC<{ version: FaceliftVersion }> = ({ version }) =>
  version === 'v1' ? <FaceliftPageDescriptionV1 /> : <FaceliftPageDescriptionV2 />;

export const FaceliftHome: React.FC<FaceliftHomeProps & { version: FaceliftVersion }> = ({
  version,
  ...props
}) => (version === 'v1' ? <FaceliftHomeV1 {...props} /> : <FaceliftHomeV2 {...props} />);
