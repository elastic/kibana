/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { Capabilities } from '@kbn/core/types';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { AppLinkItems, LinkItem } from '@kbn/security-solution-plugin/public/common/links';
import { ApplicationLinksUpdateParams } from './types';

/**
 * The ApplicationLinksUpdater class stores the links recursive hierarchy and keeps
 * the value of the app links in sync with all the application components.
 */
class ApplicationLinksUpdater {
  private readonly linksSubject$ = new BehaviorSubject<AppLinkItems>([]);

  /** Observable that stores the links recursive hierarchy */
  public readonly links$: Observable<AppLinkItems>;

  constructor() {
    this.links$ = this.linksSubject$.asObservable();
  }

  /**
   * Updates the internal app links applying the filter by permissions
   */
  public update(appLinksToUpdate: AppLinkItems, params: ApplicationLinksUpdateParams) {
    const processedAppLinks = this.processAppLinks(appLinksToUpdate, params);
    this.linksSubject$.next(processedAppLinks as AppLinkItems);
  }

  /**
   * Returns the current links value
   */
  public getLinksValue(): AppLinkItems {
    return this.linksSubject$.getValue();
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

      if (
        !this.isLinkExperimentalKeyAllowed(link, experimentalFeatures) ||
        !this.isLinkUiSettingsAllowed(link, uiSettingsClient)
      ) {
        return acc;
      }

      const extraProps: Partial<LinkItem> = { ...inheritedProps };

      if (!this.isLinkLicenseAllowed(link, license)) {
        if (!upselling.isPageUpsellable(link.id)) {
          return acc;
        }
        extraProps.unavailable = true;
      } else if (
        link.capabilities &&
        !this.hasCapabilities(capabilities, link.capabilities as string[])
      ) {
        extraProps.unauthorized = true;
      }

      const processedAppLink: LinkItem = { ...link, ...extraProps };

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

    return false;
  }

  /**
   * Check if the link is allowed based on the experimental features
   */
  private isLinkExperimentalKeyAllowed(link: LinkItem, experimentalFeatures: any) {
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
      if (
        !license.hasAtLeast(
          linkLicenseType as 'basic' | 'standard' | 'gold' | 'platinum' | 'enterprise' | 'trial'
        )
      ) {
        return false;
      }
    } else if (linkLicenseType !== 'basic') {
      return false;
    }
    return true;
  }

  /**
   * Check if the user has the required capabilities
   */
  private hasCapabilities(capabilities: Capabilities, requiredCapabilities: string[]) {
    return requiredCapabilities.every((capability) => {
      const value = capabilities[capability];
      return typeof value === 'boolean' && value === true;
    });
  }
}

// Create singleton instance of ApplicationLinksUpdater
export const applicationLinksUpdater = new ApplicationLinksUpdater();
