/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { FtrProviderContext as InheritedFtrProviderContext } from '../../ftr_provider_context';
import { AssetManagerServices } from './config_with_signals_source';

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  {}
>
  ? TServices
  : {};

export type FtrProviderContext = GenericFtrProviderContext<AssetManagerServices, {}>;
