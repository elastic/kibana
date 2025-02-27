/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled, HttpServiceSetup, Logger, RouteAuthz } from '@kbn/core/server';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  ProductFeatureKeyType,
  ProductFeaturesConfigurator,
} from '@kbn/security-solution-features';
import {
  getAssistantFeature,
  getAttackDiscoveryFeature,
  getCasesFeature,
  getSecurityFeature,
  getCasesV2Feature,
  getCasesV3Feature,
  getSecurityV2Feature,
  getTimelineFeature,
  getNotesFeature,
  getSiemMigrationsFeature,
} from '@kbn/security-solution-features/product_features';
import { API_ACTION_PREFIX } from '@kbn/security-solution-features/actions';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { ExperimentalFeatures } from '../../../common';
import { APP_ID } from '../../../common';
import { ProductFeatures } from './product_features';
import {
  securityDefaultSavedObjects,
  securityNotesSavedObjects,
  securityTimelineSavedObjects,
  securityV1SavedObjects,
} from './security_saved_objects';
import { casesApiTags, casesUiCapabilities } from './cases_privileges';

export class ProductFeaturesService {
  private securityProductFeatures: ProductFeatures;
  private securityV2ProductFeatures: ProductFeatures;
  private casesProductFeatures: ProductFeatures;
  private casesProductV2Features: ProductFeatures;
  private casesProductFeaturesV3: ProductFeatures;
  private securityAssistantProductFeatures: ProductFeatures;
  private attackDiscoveryProductFeatures: ProductFeatures;
  private timelineProductFeatures: ProductFeatures;
  private notesProductFeatures: ProductFeatures;
  private siemMigrationsProductFeatures: ProductFeatures;

  private productFeatures?: Set<ProductFeatureKeyType>;

  constructor(
    private readonly logger: Logger,
    private readonly experimentalFeatures: ExperimentalFeatures
  ) {
    const securityFeature = getSecurityFeature({
      savedObjects: securityV1SavedObjects,
      experimentalFeatures: this.experimentalFeatures,
    });
    this.securityProductFeatures = new ProductFeatures(
      this.logger,
      securityFeature.subFeaturesMap,
      securityFeature.baseKibanaFeature,
      securityFeature.baseKibanaSubFeatureIds
    );
    const securityV2Feature = getSecurityV2Feature({
      savedObjects: securityDefaultSavedObjects,
      experimentalFeatures: this.experimentalFeatures,
    });
    this.securityV2ProductFeatures = new ProductFeatures(
      this.logger,
      securityV2Feature.subFeaturesMap,
      securityV2Feature.baseKibanaFeature,
      securityV2Feature.baseKibanaSubFeatureIds
    );

    const casesFeature = getCasesFeature({
      uiCapabilities: casesUiCapabilities,
      apiTags: casesApiTags,
      savedObjects: { files: filesSavedObjectTypes },
    });

    this.casesProductFeatures = new ProductFeatures(
      this.logger,
      casesFeature.subFeaturesMap,
      casesFeature.baseKibanaFeature,
      casesFeature.baseKibanaSubFeatureIds
    );

    const casesV2Feature = getCasesV2Feature({
      uiCapabilities: casesUiCapabilities,
      apiTags: casesApiTags,
      savedObjects: { files: filesSavedObjectTypes },
    });

    this.casesProductV2Features = new ProductFeatures(
      this.logger,
      casesV2Feature.subFeaturesMap,
      casesV2Feature.baseKibanaFeature,
      casesV2Feature.baseKibanaSubFeatureIds
    );

    const casesV3Feature = getCasesV3Feature({
      uiCapabilities: casesUiCapabilities,
      apiTags: casesApiTags,
      savedObjects: { files: filesSavedObjectTypes },
    });
    this.casesProductFeaturesV3 = new ProductFeatures(
      this.logger,
      casesV3Feature.subFeaturesMap,
      casesV3Feature.baseKibanaFeature,
      casesV3Feature.baseKibanaSubFeatureIds
    );

    const assistantFeature = getAssistantFeature(this.experimentalFeatures);
    this.securityAssistantProductFeatures = new ProductFeatures(
      this.logger,
      assistantFeature.subFeaturesMap,
      assistantFeature.baseKibanaFeature,
      assistantFeature.baseKibanaSubFeatureIds
    );

    const attackDiscoveryFeature = getAttackDiscoveryFeature();

    this.attackDiscoveryProductFeatures = new ProductFeatures(
      this.logger,
      attackDiscoveryFeature.subFeaturesMap,
      attackDiscoveryFeature.baseKibanaFeature,
      attackDiscoveryFeature.baseKibanaSubFeatureIds
    );

    const timelineFeature = getTimelineFeature({
      savedObjects: securityTimelineSavedObjects,
      experimentalFeatures: {},
    });
    this.timelineProductFeatures = new ProductFeatures(
      this.logger,
      timelineFeature.subFeaturesMap,
      timelineFeature.baseKibanaFeature,
      timelineFeature.baseKibanaSubFeatureIds
    );

    const notesFeature = getNotesFeature({
      savedObjects: securityNotesSavedObjects,
      experimentalFeatures: {},
    });
    this.notesProductFeatures = new ProductFeatures(
      this.logger,
      notesFeature.subFeaturesMap,
      notesFeature.baseKibanaFeature,
      notesFeature.baseKibanaSubFeatureIds
    );

    const siemMigrationsFeature = getSiemMigrationsFeature();
    this.siemMigrationsProductFeatures = new ProductFeatures(
      this.logger,
      siemMigrationsFeature.subFeaturesMap,
      siemMigrationsFeature.baseKibanaFeature,
      siemMigrationsFeature.baseKibanaSubFeatureIds
    );
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.securityProductFeatures.init(featuresSetup);
    this.securityV2ProductFeatures.init(featuresSetup);
    this.casesProductFeatures.init(featuresSetup);
    this.casesProductV2Features.init(featuresSetup);
    this.casesProductFeaturesV3.init(featuresSetup);
    this.securityAssistantProductFeatures.init(featuresSetup);
    this.attackDiscoveryProductFeatures.init(featuresSetup);
    this.timelineProductFeatures.init(featuresSetup);
    this.notesProductFeatures.init(featuresSetup);
    this.siemMigrationsProductFeatures.init(featuresSetup);
  }

  public setProductFeaturesConfigurator(configurator: ProductFeaturesConfigurator) {
    const securityProductFeaturesConfig = configurator.security();
    this.securityProductFeatures.setConfig(securityProductFeaturesConfig);
    this.securityV2ProductFeatures.setConfig(securityProductFeaturesConfig);

    const casesProductFeaturesConfig = configurator.cases();
    this.casesProductFeatures.setConfig(casesProductFeaturesConfig);
    this.casesProductV2Features.setConfig(casesProductFeaturesConfig);
    this.casesProductFeaturesV3.setConfig(casesProductFeaturesConfig);

    const securityAssistantProductFeaturesConfig = configurator.securityAssistant();
    this.securityAssistantProductFeatures.setConfig(securityAssistantProductFeaturesConfig);

    const attackDiscoveryProductFeaturesConfig = configurator.attackDiscovery();
    this.attackDiscoveryProductFeatures.setConfig(attackDiscoveryProductFeaturesConfig);

    const timelineProductFeaturesConfig = configurator.timeline();
    this.timelineProductFeatures.setConfig(timelineProductFeaturesConfig);

    const notesProductFeaturesConfig = configurator.notes();
    this.notesProductFeatures.setConfig(notesProductFeaturesConfig);

    let siemMigrationsProductFeaturesConfig = new Map();
    if (!this.experimentalFeatures.siemMigrationsDisabled) {
      siemMigrationsProductFeaturesConfig = configurator.siemMigrations();
      this.siemMigrationsProductFeatures.setConfig(siemMigrationsProductFeaturesConfig);
    }

    this.productFeatures = new Set<ProductFeatureKeyType>(
      Object.freeze([
        ...securityProductFeaturesConfig.keys(),
        ...casesProductFeaturesConfig.keys(),
        ...securityAssistantProductFeaturesConfig.keys(),
        ...attackDiscoveryProductFeaturesConfig.keys(),
        ...timelineProductFeaturesConfig.keys(),
        ...notesProductFeaturesConfig.keys(),
        ...siemMigrationsProductFeaturesConfig.keys(),
      ]) as readonly ProductFeatureKeyType[]
    );
  }

  public isEnabled(productFeatureKey: ProductFeatureKeyType): boolean {
    if (!this.productFeatures) {
      throw new Error('ProductFeatures has not yet been configured');
    }
    return this.productFeatures.has(productFeatureKey);
  }

  public isActionRegistered(action: string) {
    return (
      this.securityProductFeatures.isActionRegistered(action) ||
      this.securityV2ProductFeatures.isActionRegistered(action) ||
      this.casesProductFeatures.isActionRegistered(action) ||
      this.casesProductV2Features.isActionRegistered(action) ||
      this.securityAssistantProductFeatures.isActionRegistered(action) ||
      this.attackDiscoveryProductFeatures.isActionRegistered(action) ||
      this.timelineProductFeatures.isActionRegistered(action) ||
      this.notesProductFeatures.isActionRegistered(action) ||
      this.siemMigrationsProductFeatures.isActionRegistered(action)
    );
  }

  public getApiActionName = (apiPrivilege: string) => `api:${API_ACTION_PREFIX}${apiPrivilege}`;

  /** @deprecated Use security.authz.requiredPrivileges instead */
  public isApiPrivilegeEnabled(apiPrivilege: string) {
    return this.isActionRegistered(this.getApiActionName(apiPrivilege));
  }

  public registerApiAccessControl(http: HttpServiceSetup) {
    // The `securitySolutionProductFeature:` prefix is used for ProductFeature based control.
    // Should be used only by routes that do not need RBAC, only direct productFeature control.
    const APP_FEATURE_TAG_PREFIX = 'securitySolutionProductFeature:';

    /** @deprecated Use security.authz.requiredPrivileges instead */
    const API_ACTION_TAG_PREFIX = `access:${APP_ID}-`;

    const isAuthzEnabled = (authz?: RecursiveReadonly<RouteAuthz>): authz is AuthzEnabled => {
      return Boolean((authz as AuthzEnabled)?.requiredPrivileges);
    };

    /** Returns true only if the API privilege is a security action and is disabled */
    const isApiPrivilegeSecurityAndDisabled = (apiPrivilege: string): boolean => {
      if (apiPrivilege.startsWith(API_ACTION_PREFIX)) {
        return !this.isActionRegistered(`api:${apiPrivilege}`);
      }
      return false;
    };

    http.registerOnPostAuth((request, response, toolkit) => {
      for (const tag of request.route.options.tags ?? []) {
        let isEnabled = true;
        if (tag.startsWith(APP_FEATURE_TAG_PREFIX)) {
          isEnabled = this.isEnabled(
            tag.substring(APP_FEATURE_TAG_PREFIX.length) as ProductFeatureKeyType
          );
        } else if (tag.startsWith(API_ACTION_TAG_PREFIX)) {
          isEnabled = this.isApiPrivilegeEnabled(tag.substring(API_ACTION_TAG_PREFIX.length));
        }

        if (!isEnabled) {
          this.logger.warn(
            `Accessing disabled route "${request.url.pathname}${request.url.search}": responding with 404`
          );
          return response.notFound();
        }
      }

      // This control ensures the action privileges have been registered by the productFeature service,
      // preventing full access (`*`) roles, such as superuser, from bypassing productFeature controls.
      const authz = request.route.options.security?.authz;
      if (isAuthzEnabled(authz)) {
        const disabled = authz.requiredPrivileges.some((privilegeEntry) => {
          if (typeof privilegeEntry === 'object') {
            if (privilegeEntry.allRequired) {
              if (privilegeEntry.allRequired.some(isApiPrivilegeSecurityAndDisabled)) {
                return true;
              }
            }
            if (privilegeEntry.anyRequired) {
              if (privilegeEntry.anyRequired.every(isApiPrivilegeSecurityAndDisabled)) {
                return true;
              }
            }
            return false;
          } else {
            return isApiPrivilegeSecurityAndDisabled(privilegeEntry);
          }
        });
        if (disabled) {
          this.logger.warn(
            `Accessing disabled route "${request.url.pathname}${request.url.search}": responding with 404`
          );
          return response.notFound();
        }
      }

      return toolkit.next();
    });
  }
}
