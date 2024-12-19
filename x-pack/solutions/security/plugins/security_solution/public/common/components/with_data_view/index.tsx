/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentType } from 'react';
import type { ReactElement } from 'react-markdown';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewErrorComponent } from './data_view_error';
import { useGetScopedSourcererDataView } from '../../../sourcerer/components/use_get_sourcerer_data_view';
import { SourcererScopeName } from '../../../sourcerer/store/model';

type OmitDataView<T> = T extends { dataView: DataView } ? Omit<T, 'dataView'> : T;

interface WithDataViewArg {
  dataView: DataView;
}

/**
 *
 * This HOC makes sure the dataView is populated
 * otherwise it will render the provided/default Error component
 *
 * */
export const withDataView = <P extends WithDataViewArg>(
  Component: ComponentType<P & WithDataViewArg>,
  fallback?: ReactElement
) => {
  const ComponentWithDataView = (props: OmitDataView<P>) => {
    const dataView = useGetScopedSourcererDataView({
      sourcererScope: SourcererScopeName.timeline,
    });

    if (!dataView) {
      return fallback ?? <DataViewErrorComponent />;
    }

    return <Component {...(props as unknown as P)} dataView={dataView} />;
  };

  return ComponentWithDataView;
};
