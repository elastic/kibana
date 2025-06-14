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
import { AppLinkItems, LinkItem, NormalizedLinks } from '@kbn/security-solution-plugin/public';

/**
 * Dependencies to update the application links
 */
export interface ApplicationLinksUpdateParams {
  capabilities: Capabilities;
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
    const processedAppLinks = this.processAppLinks(appLinksToUpdate, params);
    console.log('processedAppLinks', processedAppLinks);
    this.linksSubject$.next(Object.freeze(processedAppLinks));
    this.normalizedLinksSubject$.next(Object.freeze(this.getNormalizedLinks(processedAppLinks)));
  }

  /**
   * Returns the current links value
   */
  public getLinksValue(): AppLinkItems {
    return this.linksSubject$.getValue();
  }

  /**
   * Returns the current normalized links value
   */
  public getNormalizedLinksValue(): NormalizedLinks {
    return this.normalizedLinksSubject$.getValue();
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
    const { uiSettingsClient, capabilities, license, upselling } = params;

    return appLinks.reduce<LinkItem[]>((acc, appLink) => {
      const { links, ...link } = appLink;

      const processedAppLink: LinkItem = { ...link };

      // Process children links if they exist
      if (links) {
        const childrenLinks = this.processAppLinks(links, params);
        if (childrenLinks.length > 0) {
          processedAppLink.links = childrenLinks;
        }
      }

      acc.push(processedAppLink);
      return acc;
    }, []);
  }
}

// Create singleton instance of ApplicationLinksUpdater
export const applicationLinksUpdater = new ApplicationLinksUpdater();
