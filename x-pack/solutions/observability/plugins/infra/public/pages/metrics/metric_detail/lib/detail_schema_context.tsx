/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';

export interface DetailSchemaState {
  schema?: DataSchemaFormat;
  pending: boolean;
}

const defaultDetailSchema: DetailSchemaState = { pending: false };

const DetailSchemaContext = createContext<DetailSchemaState>(defaultDetailSchema);

export const DetailSchemaProvider = ({
  value,
  children,
}: {
  value: DetailSchemaState;
  children: React.ReactNode;
}) => <DetailSchemaContext.Provider value={value}>{children}</DetailSchemaContext.Provider>;

export const useDetailSchema = (): DetailSchemaState => useContext(DetailSchemaContext);
