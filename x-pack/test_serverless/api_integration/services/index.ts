/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { services as deploymentAgnosticSharedServices } from '../../shared/services/deployment_agnostic_services';
import { services as svlSharedServices } from '../../shared/services';

import { AlertingApiProvider } from './alerting_api';
import { SamlToolsProvider } from './saml_tools';
import { SvlCasesServiceProvider } from './svl_cases';
import { SloApiProvider } from './slo_api';
import { TransformProvider } from './transform';

import { SvlEnrichPoliciesApi } from './index_management/svl_enrich_policies.api';
import { SvlSettingsApi } from './index_management/svl_settings.api';
import { SvlIndicesApi } from './index_management/svl_indices.api';
import { SvlIndicesHelpers } from './index_management/svl_indices.helpers';
import { SvlEnrichPoliciesHelpers } from './index_management/svl_enrich_policies.helpers';
import { SvlDatastreamsHelpers } from './index_management/svl_datastreams.helpers';
import { SvlComponentTemplatesApi } from './index_management/svl_component_templates.api';
import { SvlComponentTemplateHelpers } from './index_management/svl_component_templates.helpers';
import { SvlTemplatesHelpers } from './index_management/svl_templates.helpers';
import { SvlTemplatesApi } from './index_management/svl_templates.api';
import { SvlMappingsApi } from './index_management/svl_mappings.api';
import { SynthtraceProvider } from './synthtrace';
import { SvlClusterNodesApi } from './index_management/svl_cluster_nodes.api';

export const services = {
  // deployment agnostic FTR services
  ...deploymentAgnosticSharedServices,

  // serverless FTR services
  ...svlSharedServices,
  alertingApi: AlertingApiProvider,
  samlTools: SamlToolsProvider,
  svlCases: SvlCasesServiceProvider,
  sloApi: SloApiProvider,
  transform: TransformProvider,
  synthtrace: SynthtraceProvider,
  svlEnrichPoliciesApi: SvlEnrichPoliciesApi,
  svlSettingsApi: SvlSettingsApi,
  svlIndicesApi: SvlIndicesApi,
  svlIndicesHelpers: SvlIndicesHelpers,
  svlEnrichPoliciesHelpers: SvlEnrichPoliciesHelpers,
  svlDatastreamsHelpers: SvlDatastreamsHelpers,
  svlComponentTemplatesApi: SvlComponentTemplatesApi,
  svlComponentTemplateHelpers: SvlComponentTemplateHelpers,
  svlTemplatesHelpers: SvlTemplatesHelpers,
  svlTemplatesApi: SvlTemplatesApi,
  svlMappingsApi: SvlMappingsApi,
  svlClusterNodesApi: SvlClusterNodesApi,
};

export type InheritedFtrProviderContext = GenericFtrProviderContext<typeof services, {}>;

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  {}
>
  ? TServices
  : {};
