/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import type { ChromeStart } from '@kbn/core/public';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { alertZeroLink } from '@kbn/security-solution-navigation/links';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ClassicPageTemplate } from '../../types';

/**
 * The page template to render AlertZero in: the registered one in Classic chrome, none otherwise.
 * The navigation plugin sets the chrome style once the active space has loaded, and changing it
 * reloads the page, so the style is read after the space. If the space can't be read, the chrome
 * keeps its current style.
 */
export const resolveClassicPageTemplate = async ({
  template,
  chrome,
  spaces,
}: {
  template?: ClassicPageTemplate;
  chrome: Pick<ChromeStart, 'getChromeStyle'>;
  spaces?: Pick<SpacesPluginStart, 'getActiveSpace'>;
}): Promise<ClassicPageTemplate | undefined> => {
  if (!template) return undefined;
  await spaces?.getActiveSpace().catch(() => undefined);
  return chrome.getChromeStyle() === 'classic' ? template : undefined;
};

/** The navigation entry of the current page: the AlertZero deep link its route belongs to. */
const getSelectedNavId = (pathname: string): string => {
  if (pathname.startsWith('/escalations'))
    return alertZeroLink(SecurityPageName.alertZeroEscalations);
  if (pathname.startsWith('/watches')) return alertZeroLink(SecurityPageName.alertZeroWatches);
  return alertZeroLink(SecurityPageName.alertZeroHome);
};

interface ClassicPageTemplateHostProps {
  /** Set only in Classic chrome, when Security Solution has registered its page template. */
  template?: ClassicPageTemplate;
  children: React.ReactNode;
}

/** Renders AlertZero inside the Security page template, so its pages show the Security navigation. */
export const ClassicPageTemplateHost: React.FC<ClassicPageTemplateHostProps> = ({
  template: Template,
  children,
}) => {
  const { pathname } = useLocation();
  if (!Template) {
    return <>{children}</>;
  }
  return <Template selectedId={getSelectedNavId(pathname)}>{children}</Template>;
};
