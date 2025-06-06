/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { useSourcererDataView } from '../containers';
import { useKibana } from '../../common/lib/kibana';
import type { SourcererScopeName } from '../store/model';

export interface UseGetScopedSourcererDataViewArgs {
  sourcererScope: SourcererScopeName;
}

/*
 *
 * returns the created dataView based on sourcererDataView spec
 * returned from useSourcererDataView
 *
 * */
export const useGetScopedSourcererDataView = ({
  sourcererScope,
}: UseGetScopedSourcererDataViewArgs): DataView | undefined => {
  const {
    services: { fieldFormats },
  } = useKibana();
  const { sourcererDataView } = useSourcererDataView(sourcererScope);

  const dataView = useMemo(() => {
    if (Object.keys(sourcererDataView).length) {
      return new DataView({ spec: sourcererDataView, fieldFormats });
    } else {
      return undefined;
    }
  }, [sourcererDataView, fieldFormats]);

  return dataView;
};
