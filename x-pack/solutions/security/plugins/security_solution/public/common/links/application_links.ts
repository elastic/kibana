/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { SecurityPageName } from '../../../common/constants';
import { hasCapabilities } from '../lib/capabilities';
import type { AppLinkItems, LinkItem, NormalizedLinks, LinksPermissions } from './types';

/**
 * Application links class, it stores the links recursive hierarchy and keeps
 * the value of the app links in sync with all the application components.
 * It can be updated using the `update` method.
 *
 * It's meant to be used as a singleton instance.
 */
class ApplicationLinks {
  private readonly linksUpdater$ = new BehaviorSubject<AppLinkItems>([]);
  private readonly normalizedLinksUpdater$ = new BehaviorSubject<NormalizedLinks>({});

  /** Observable that stores the links recursive hierarchy */
  public readonly links$: Observable<AppLinkItems>;
  /** Observable that stores all the links indexed by `SecurityPageName` */
  public readonly normalizedLinks$: Observable<NormalizedLinks>;

  constructor() {
    this.links$ = this.linksUpdater$.asObservable();
    this.normalizedLinks$ = this.normalizedLinksUpdater$.asObservable();
  }

  /**
   * Updates the internal app links applying the filter by permissions
   */
  public update(appLinksToUpdate: AppLinkItems, linksPermissions: LinksPermissions) {
    const filteredAppLinks = this.filterAppLinks(appLinksToUpdate, linksPermissions);
    this.linksUpdater$.next(Object.freeze(filteredAppLinks));
    this.normalizedLinksUpdater$.next(Object.freeze(this.getNormalizedLinks(filteredAppLinks)));
  }

  /**
   * Returns the current links value
   */
  public getLinksValue(): AppLinkItems {
    return this.linksUpdater$.getValue();
  }

  /**
   * Returns the current normalized links value
   */
  public getNormalizedLinksValue(): NormalizedLinks {
    return this.normalizedLinksUpdater$.getValue();
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
  private filterAppLinks(appLinks: AppLinkItems, linksPermissions: LinksPermissions): LinkItem[] {
    return appLinks.reduce<LinkItem[]>((acc, { links, ...appLinkInfo }) => {
      if (
        !this.isLinkExperimentalKeyAllowed(appLinkInfo, linksPermissions) ||
        !this.isLinkUiSettingsAllowed(appLinkInfo, linksPermissions)
      ) {
        return acc;
      }

      if (
        !hasCapabilities(linksPermissions.capabilities, appLinkInfo.capabilities) ||
        !this.isLinkLicenseAllowed(appLinkInfo, linksPermissions)
      ) {
        if (linksPermissions.upselling.isPageUpsellable(appLinkInfo.id)) {
          acc.push({ ...appLinkInfo, unauthorized: true });
        }
        return acc; // not adding sub-links for links that are not authorized
      }

      const resultAppLink: LinkItem = appLinkInfo;
      if (links) {
        const childrenLinks = this.filterAppLinks(links, linksPermissions);
        if (childrenLinks.length > 0) {
          resultAppLink.links = childrenLinks;
        }
      }

      acc.push(resultAppLink);
      return acc;
    }, []);
  }

  /**
   * Check if the link is allowed based on the uiSettingsClient
   */
  private isLinkUiSettingsAllowed(link: LinkItem, { uiSettingsClient }: LinksPermissions) {
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
  private isLinkExperimentalKeyAllowed(link: LinkItem, { experimentalFeatures }: LinksPermissions) {
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
  private isLinkLicenseAllowed(link: LinkItem, { license }: LinksPermissions) {
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

// Create singleton instance of ApplicationLinks
export const applicationLinks = new ApplicationLinks();
