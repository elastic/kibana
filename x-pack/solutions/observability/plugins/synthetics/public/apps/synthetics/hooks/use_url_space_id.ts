/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibanaSpace } from '../../../hooks/use_kibana_space';
import { useGetUrlParams } from './use_url_params';

/**
 * Returns the `spaceId` URL query param when the user is viewing a monitor that
 * belongs to a different space than the active one. Used to thread cross-space
 * context through navigation links inside the monitor detail/sub-route pages.
 *
 * Returns `undefined` when no cross-space context is in effect, so callers can
 * spread it into URL builders without producing an empty `?spaceId=` segment.
 */
export const useUrlSpaceId = (): string | undefined => {
  const { space } = useKibanaSpace();
  const { spaceId } = useGetUrlParams();

  return spaceId && spaceId !== space?.id ? spaceId : undefined;
};
