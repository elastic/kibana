/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { queryKeys } from '../query_keys';

type KibanaServices = CoreStart & { security?: SecurityPluginStart };

/** Returns the current user's email, falling back to their username. Undefined until resolved. */
export const useCurrentUser = (): string | undefined => {
  const {
    services: { security },
  } = useKibana<KibanaServices>();

  const { data } = useQuery({
    queryKey: queryKeys.currentUser.get(),
    // security is an optional plugin dep; absent in minimal Kibana deployments without X-Pack security
    enabled: Boolean(security?.authc),
    queryFn: async () => {
      const user = await security!.authc.getCurrentUser();
      return user.email ?? user.username;
    },
  });

  return data;
};
