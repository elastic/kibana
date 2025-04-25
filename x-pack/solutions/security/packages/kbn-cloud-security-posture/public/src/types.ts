/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { HttpSetup, ToastsStart } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { CspFinding, RuleResponse } from '@kbn/cloud-security-posture-common';
import type { estypes } from '@elastic/elasticsearch';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';

import type { BoolQuery } from '@kbn/es-query';
export interface BaseEsQuery {
  query?: {
    bool: BoolQuery;
  };
}

export interface CspClientPluginStartDeps {
  // required
  data: DataPublicPluginStart;
  dataViews: DataViewsServicePublic;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
  toastNotifications: ToastsStart;
  charts: ChartsPluginStart;
  discover: DiscoverStart;
  fleet: FleetStart;
  licensing: LicensingPluginStart;
  share: SharePluginStart;
  storage: Storage;
  spaces: SpacesPluginStart;
  cloud: CloudSetup;

  // optional
  usageCollection?: UsageCollectionStart;
}

export interface CspBaseEsQuery {
  query?: {
    bool: {
      filter: Array<estypes.QueryDslQueryContainer | undefined> | undefined;
    };
  };
}

export interface UseCspOptions extends CspBaseEsQuery {
  sort?: Array<{
    [key: string]: string;
  }>;
  enabled: boolean;
  pageSize: number;
  ignore_unavailable?: boolean;
}

export type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
export type LatestFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, FindingsAggs>
>;

export interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

interface BaseFlyoutProps {
  ruleId: string;
  resourceId: string;
}

interface PreviewModeProps {
  isPreviewMode: true;
  scopeId: string;
  banner: {
    title: string;
    backgroundColor: string;
    textColor: string;
  };
}

interface NonPreviewModeProps {
  isPreviewMode?: false | undefined;
}
export type FindingsMisconfigurationPanelExpandableFlyoutPropsNonPreview = FlyoutPanelProps & {
  id: 'findings-misconfiguration-panel';
  params: BaseFlyoutProps & NonPreviewModeProps;
};

export type FindingsMisconfigurationPanelExpandableFlyoutPropsPreview = FlyoutPanelProps & {
  id: 'findings-misconfiguration-panel-preview';
  params: BaseFlyoutProps & PreviewModeProps;
};

export type FindingsMisconfigurationPanelExpandableFlyoutProps =
  | FindingsMisconfigurationPanelExpandableFlyoutPropsNonPreview
  | FindingsMisconfigurationPanelExpandableFlyoutPropsPreview;

export interface FindingsMisconfigurationFlyoutHeaderProps {
  finding: CspFinding;
}

export interface FindingsMisconfigurationFlyoutContentProps {
  finding: CspFinding;
  isPreviewMode?: boolean;
}

export interface FindingMisconfigurationFlyoutFooterProps {
  createRuleFn: (http: HttpSetup) => Promise<RuleResponse>;
}

export interface FindingMisconfigurationFlyoutContentProps {
  finding: CspFinding;
  createRuleFn: (http: HttpSetup) => Promise<RuleResponse>;
  isPreviewMode?: boolean;
}
