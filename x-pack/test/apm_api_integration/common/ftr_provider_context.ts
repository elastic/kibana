/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericFtrProviderContext } from '@kbn/test/types/ftr';
import { FtrProviderContext as InheritedFtrProviderContext } from '../../api_integration/ftr_provider_context';
import { ApmServices } from './config';

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  {}
>
  ? TServices
  : {};

export { InheritedFtrProviderContext };
export type FtrProviderContext = GenericFtrProviderContext<ApmServices, {}>;
