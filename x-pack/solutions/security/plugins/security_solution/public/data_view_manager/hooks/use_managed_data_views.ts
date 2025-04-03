/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { sharedStateSelector } from '../redux/selectors';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';

export const useManagedDataViews = () => {
  const { dataViews } = useSelector(sharedStateSelector);
  const {
    services: { fieldFormats },
  } = useKibana();

  return useMemo(() => {
    const managed = dataViews
      .filter((dv) => dv.id === DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID)
      .map((spec) => new DataView({ spec, fieldFormats }));

    return managed;
  }, [dataViews, fieldFormats]);
};
