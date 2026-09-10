/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Location } from 'history';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { getAlertsNavPanel } from './get_alerts_nav_panel';

const location = {} as Location;
const prepend = (path: string) => path;

const isActive = (
  node: ReturnType<typeof getAlertsNavPanel>[number],
  pathNameSerialized: string
): boolean => {
  if (!node.getIsActive) {
    throw new Error('expected getIsActive');
  }

  return node.getIsActive({ pathNameSerialized, prepend, location });
};

describe('getAlertsNavPanel', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => false as T;
  });

  it('returns a flat Alerts link when alerting v2 is disabled', () => {
    const result = getAlertsNavPanel(core);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        link: 'observability-overview:alerts',
        icon: 'warning',
      })
    );
    expect(result[0]).not.toHaveProperty('renderAs');
    expect(result[0]).not.toHaveProperty('children');
  });

  it('returns a panel opener with the four groups when alerting v2 is enabled', () => {
    core.settings.globalClient.get = <T>(_key: string) => true as T;

    const result = getAlertsNavPanel(core);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'alerting',
        link: 'observability-overview:alerts',
        icon: 'warning',
        renderAs: 'panelOpener',
      })
    );
    expect(result[0].children).toHaveLength(4);
    expect(result[0].children?.[0]).toEqual(
      expect.objectContaining({
        breadcrumbStatus: 'hidden',
        children: [
          expect.objectContaining({
            link: 'observabilityAlerting:inbox',
            title: 'Inbox',
            badgeType: 'new',
          }),
          expect.objectContaining({
            link: 'observability-overview:alerts',
            title: 'Alerts V1',
          }),
        ],
      })
    );
    expect(result[0].children?.[1]).toEqual(
      expect.objectContaining({
        title: 'Rule Management',
        breadcrumbStatus: 'hidden',
        children: [
          { link: 'observabilityAlerting:rules-v2' },
          { link: 'observabilityAlerting:rules-v1', sideNavStatus: 'hidden' },
          { link: 'observabilityAlerting:rule-library', badgeType: 'new' },
        ],
      })
    );
    expect(result[0].children?.[2]).toEqual(
      expect.objectContaining({
        title: 'Notifications and Suppressions',
        breadcrumbStatus: 'hidden',
        children: [
          { link: 'observabilityAlerting:action-policies', badgeType: 'new' },
          { link: 'management:maintenanceWindows' },
        ],
      })
    );
    expect(result[0].children?.[3]).toEqual(
      expect.objectContaining({
        title: 'Operations',
        breadcrumbStatus: 'hidden',
        children: [{ link: 'observabilityAlerting:execution-history', badgeType: 'new' }],
      })
    );
  });

  it('keeps rules-v1 in the tree with a hidden side-nav status', () => {
    core.settings.globalClient.get = <T>(_key: string) => true as T;

    const ruleManagement = getAlertsNavPanel(core)[0].children?.[1];
    const rulesV1 = ruleManagement?.children?.find(
      (child) => child.link === 'observabilityAlerting:rules-v1'
    );

    expect(rulesV1).toEqual({
      link: 'observabilityAlerting:rules-v1',
      sideNavStatus: 'hidden',
    });
  });

  it('marks both alerting and alerts URL prefixes as active', () => {
    const [node] = getAlertsNavPanel(core);

    expect(isActive(node, '/app/observability/alerting/inbox')).toBe(true);
    expect(isActive(node, '/app/observability/alerts')).toBe(true);
    expect(isActive(node, '/app/observability/overview')).toBe(false);
  });
});
