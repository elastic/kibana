/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory, useLocation } from 'react-router-dom';

export const useFilterProximalParam = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const history = useHistory();

  const setProximalFilterParam = (proximalFilter: boolean) => {
    searchParams.set('filterProximal', String(proximalFilter));
    history.replace({ search: searchParams.toString() });
  };

  const filterProximal = searchParams.get('filterProximal') === 'true';

  return { filterProximal, setProximalFilterParam };
};
