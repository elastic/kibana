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
import {
  FaceliftHome as FaceliftHomeV3,
  FaceliftPageDescription as FaceliftPageDescriptionV3,
} from './v3/facelift_home';
import {
  FaceliftHome as FaceliftHomeV4,
  FaceliftPageDescription as FaceliftPageDescriptionV4,
} from './v4/facelift_home';
import {
  FaceliftHome as FaceliftHomeV5,
  FaceliftPageDescription as FaceliftPageDescriptionV5,
} from './v5/facelift_home';

export type { FaceliftHomeProps };

export const FaceliftPageDescription: React.FC<{ version: FaceliftVersion }> = ({ version }) => {
  switch (version) {
    case 'v1':
      return <FaceliftPageDescriptionV1 />;
    case 'v2':
      return <FaceliftPageDescriptionV2 />;
    case 'v3':
      return <FaceliftPageDescriptionV3 />;
    case 'v4':
      return <FaceliftPageDescriptionV4 />;
    case 'v5':
      return <FaceliftPageDescriptionV5 />;
  }
};

export const FaceliftHome: React.FC<FaceliftHomeProps & { version: FaceliftVersion }> = ({
  version,
  ...props
}) => {
  switch (version) {
    case 'v1':
      return <FaceliftHomeV1 {...props} />;
    case 'v2':
      return <FaceliftHomeV2 {...props} />;
    case 'v3':
      return <FaceliftHomeV3 {...props} />;
    case 'v4':
      return <FaceliftHomeV4 {...props} />;
    case 'v5':
      return <FaceliftHomeV5 {...props} />;
  }
};
