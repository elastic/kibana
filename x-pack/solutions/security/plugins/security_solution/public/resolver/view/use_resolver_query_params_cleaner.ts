/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux-v7';
import { parameterName } from '../store/parameter_name';
/**
 * Cleanup any query string keys that were added by this Resolver instance.
 * This works by having a React effect that just has behavior in the 'cleanup' function.
 */
export function useResolverQueryParamCleaner(id: string) {
  const dispatch = useDispatch();

  const history = useHistory();

  const resolverKey = parameterName(id);

  useEffect(() => {
    /**
     * Keep track of the old query string keys so we can remove them.
     */
    const oldResolverKey = resolverKey;
    /**
     * When `idKey` or `eventKey` changes (such as when the `resolverComponentInstanceID` has changed) or when the component unmounts, remove any state from the query string.
     */
    return () => {
      /**
       * Read the CURRENT url search at cleanup time — NOT a value snapshotted during render.
       * Other code (e.g. the flyout_v2 URL sync clearing its own param when the flyout closes)
       * may have changed the query string after this component's last render; replaying a stale
       * snapshot here would resurrect those params. We only want to remove our own resolver key
       * and preserve everything else that is currently in the url.
       */
      const urlSearchParams = new URLSearchParams(history.location.search);

      /**
       * Remove old keys from the url
       */
      urlSearchParams.delete(oldResolverKey);
      const relativeURL = { search: urlSearchParams.toString() };
      history.replace(relativeURL);
    };
  }, [resolverKey, history, dispatch, id]);
}
