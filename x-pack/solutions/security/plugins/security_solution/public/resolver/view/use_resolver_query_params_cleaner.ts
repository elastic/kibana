/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { parameterName } from '../store/parameter_name';
/**
 * Cleanup any query string keys that were added by this Resolver instance.
 * This works by having a React effect that just has behavior in the 'cleanup' function.
 */
export function useResolverQueryParamCleaner(id: string) {
  /**
   * Keep a reference to the current search value. This is used in the cleanup function.
   * This value of useLocation().search isn't used directly since that would change and
   * we only want the cleanup to run on unmount or when the resolverComponentInstanceID
   * changes.
   */
  const searchRef = useRef<string>();
  searchRef.current = useLocation().search;
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
       * This effect must not be invalidated when `search` changes.
       */
      const urlSearchParams = new URLSearchParams(searchRef.current);

      /**
       * Remove old keys from the url
       */
      urlSearchParams.delete(oldResolverKey);
      const relativeURL = { search: urlSearchParams.toString() };
      history.replace(relativeURL);
    };
  }, [resolverKey, history, dispatch, id]);
}
