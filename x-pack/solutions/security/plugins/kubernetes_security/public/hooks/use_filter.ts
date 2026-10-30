/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import {
  getCopyButton,
  getFilterForValueButton,
  getFilterOutValueButton,
} from '@kbn/securitysolution-timeline-components';
import type { StartPlugins } from '../types';

export const useSetFilter = () => {
  const { data } = useKibana<CoreStart & StartPlugins>().services;

  const filterManager = useMemo(() => data.query.filterManager, [data.query.filterManager]);

  return {
    getFilterForValueButton,
    getFilterOutValueButton,
    getCopyButton,
    filterManager,
  };
};
