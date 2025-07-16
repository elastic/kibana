/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { SecurityPageName } from '@kbn/security-solution-navigation';
import type { Capabilities } from '@kbn/core/types';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ExperimentalFeatures } from '../../../common';
import type { AppLinkItems, LinkItem, NormalizedLinks } from '../../common/links/types';
import { hasCapabilities, existCapabilities } from '../../common/lib/capabilities';

/**
 * Dependencies to update the application links
 */
export interface ApplicationLinksUpdateParams {
  capabilities: Capabilities;
  experimentalFeatures: Readonly<ExperimentalFeatures>;
  uiSettingsClient: IUiSettingsClient;
  upselling: UpsellingService;
  license?: ILicense;
}

/**
 * The ApplicationLinksUpdater class stores the links recursive hierarchy and keeps
 * the value of the app links in sync with all the application components.
 * It can be updated using the `update` method.
 *
 * It's meant to be used as a singleton instance.
 */
class ApplicationLinksUpdater {
  private readonly linksSubject$ = new BehaviorSubject<AppLinkItems>([]);
  private readonly normalizedLinksSubject$ = new BehaviorSubject<NormalizedLinks>({});
  private lastUpdateParams?: ApplicationLinksUpdateParams | undefined;

  /** Observable that stores the links recursive hierarchy */
  public readonly links$: Observable<AppLinkItems>;
  /** Observable that stores all the links indexed by `SecurityPageName` */
  public readonly normalizedLinks$: Observable<NormalizedLinks>;

  constructor() {
    this.links$ = this.linksSubject$.asObservable();
    this.normalizedLinks$ = this.normalizedLinksSubject$.asObservable();
  }

  /**
   * Updates the internal app links applying the filter by permissions
   */
  public update(appLinksToUpdate: AppLinkItems, params: ApplicationLinksUpdateParams) {
    this.lastUpdateParams = params;
    const processedAppLinks = this.processAppLinks(appLinksToUpdate, params);
    this.linksSubject$.next(Object.freeze(processedAppLinks));
    this.normalizedLinksSubject$.next(Object.freeze(this.getNormalizedLinks(processedAppLinks)));
  }

  /**
   * Returns the current normalized links value
   */
  public getNormalizedLinksValue(): NormalizedLinks {
    return this.normalizedLinksSubject$.getValue();
  }

  /**
   * Updates a specific app link by its `SecurityPageName` identifier.
   */
  public updateAppLink(id: SecurityPageName, appLink: Partial<LinkItem>) {
    if (!this.lastUpdateParams) {
      throw new Error(
        'Cannot update app link without previous update params. Please call `update` method first.'
      );
    }
    const currentLinks = this.linksSubject$.getValue();
    const updatedLinks = this.getUpdatedAppLink(id, appLink, currentLinks);
    this.update(updatedLinks, this.lastUpdateParams);
  }

  private getUpdatedAppLink(
    id: SecurityPageName,
    appLinkUpdate: Partial<LinkItem>,
    currentLinks: AppLinkItems
  ): LinkItem[] {
    return currentLinks.map((link) => {
      if (link.id === id) {
        return { ...link, ...appLinkUpdate };
      }
      if (link.links) {
        return { ...link, links: this.getUpdatedAppLink(id, appLinkUpdate, link.links) };
      }
      return link;
    });
  }

  /**
   * Creates the `NormalizedLinks` structure from a `LinkItem` array
   */
  private getNormalizedLinks(
    currentLinks: AppLinkItems,
    parentId?: SecurityPageName
  ): NormalizedLinks {
    return currentLinks.reduce<NormalizedLinks>((normalized, { links, ...currentLink }) => {
      normalized[currentLink.id] = {
        ...currentLink,
        parentId,
      };
      if (links && links.length > 0) {
        Object.assign(normalized, this.getNormalizedLinks(links, currentLink.id));
      }
      return normalized;
    }, {});
  }

  /**
   * Filters the app links based on the links configuration
   */
  private processAppLinks(
    appLinks: AppLinkItems,
    params: ApplicationLinksUpdateParams,
    inheritedProps: Partial<LinkItem> = {}
  ): LinkItem[] {
    const { experimentalFeatures, uiSettingsClient, capabilities, license, upselling } = params;

    return appLinks.reduce<LinkItem[]>((acc, appLink) => {
      const { links, ...link } = appLink;
      // Check experimental flags and uiSettings, removing the link if any of them is defined and disabled
      if (
        !this.isLinkExperimentalKeyAllowed(link, experimentalFeatures) ||
        !this.isLinkUiSettingsAllowed(link, uiSettingsClient)
      ) {
        return acc;
      }

      // Extra props to be assigned to the current link and its children
      const extraProps: Partial<LinkItem> = { ...inheritedProps };

      // Check link availability
      if (
        !existCapabilities(capabilities, link.capabilities) ||
        !this.isLinkLicenseAllowed(link, license)
      ) {
        // The link is not available in the current product payment plan
        if (!upselling.isPageUpsellable(link.id)) {
          return acc; // no upselling registered for this link, just exclude it
        }
        extraProps.unavailable = true;

        // Check link authorization only if it is available
      } else if (!hasCapabilities(capabilities, link.capabilities)) {
        // Required capabilities exist but are not granted
        extraProps.unauthorized = true;
      }

      const processedAppLink: LinkItem = { ...link, ...extraProps };

      // Process children links if they exist
      if (links) {
        const childrenLinks = this.processAppLinks(links, params, extraProps);
        if (childrenLinks.length > 0) {
          processedAppLink.links = childrenLinks;
        }
      }

      acc.push(processedAppLink);
      return acc;
    }, []);
  }

  /**
   * Check if the link is allowed based on the uiSettingsClient
   */
  private isLinkUiSettingsAllowed(link: LinkItem, uiSettingsClient: IUiSettingsClient) {
    if (!link.uiSettingRequired) {
      return true;
    }

    if (typeof link.uiSettingRequired === 'string') {
      return uiSettingsClient.get(link.uiSettingRequired) === true;
    }

    if (typeof link.uiSettingRequired === 'object') {
      return uiSettingsClient.get(link.uiSettingRequired.key) === link.uiSettingRequired.value;
    }

    // unsupported uiSettingRequired type
    return false;
  }

  /**
   * Check if the link is allowed based on the experimental features
   */
  private isLinkExperimentalKeyAllowed(link: LinkItem, experimentalFeatures: ExperimentalFeatures) {
    if (link.hideWhenExperimentalKey && experimentalFeatures[link.hideWhenExperimentalKey]) {
      return false;
    }

    if (link.experimentalKey && !experimentalFeatures[link.experimentalKey]) {
      return false;
    }
    return true;
  }

  /**
   * Check if the link is allowed based on the license
   */
  private isLinkLicenseAllowed(link: LinkItem, license: ILicense | undefined) {
    const linkLicenseType = link.licenseType ?? 'basic';
    if (license) {
      if (!license.hasAtLeast(linkLicenseType)) {
        return false;
      }
    } else if (linkLicenseType !== 'basic') {
      return false;
    }
    return true;
  }
}

// Create singleton instance of ApplicationLinksUpdater
export const applicationLinksUpdater = new ApplicationLinksUpdater();
