/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mobileDocuments } from './documents';
import { mobilePanelQuery, withEnvironment } from './filters';
import { withKpiStats } from './kpis';

describe('mobilePanelQuery', () => {
  it('sends the request values as params', () => {
    const { query, params } = withKpiStats(
      mobilePanelQuery({ serviceName: 'shop-mobile', osName: 'iPadOS', release: '1.2.3' })
    ).toRequest();

    expect(query).toContain('`service.name` == ?service_name');
    expect(query).toContain('`resource.attributes.os.name` == ?os_name');
    expect(query).toContain('`service.version` == ?release');
    expect(query).toContain('sessions = COUNT_DISTINCT(`attributes.session.id`)');
    expect(params).toEqual([
      { service_name: 'shop-mobile' },
      { os_name: 'iPadOS' },
      { release: '1.2.3' },
    ]);
  });

  it('covers every platform without an OS filter', () => {
    const { query } = mobilePanelQuery({ serviceName: 'shop-mobile' }).toRequest();

    expect(query).not.toContain('?os_name');
    expect(query).not.toContain('platform ==');
  });
});

describe('withEnvironment', () => {
  const print = (environment?: string) =>
    withEnvironment(mobileDocuments(), environment).print('basic');

  it('filters nothing for all environments', () => {
    expect(print(undefined)).toBe(mobileDocuments().print('basic'));
    expect(print('ENVIRONMENT_ALL')).toBe(mobileDocuments().print('basic'));
  });

  it('matches either environment field', () => {
    expect(print('production')).toContain(
      '| WHERE `service.environment` == "production" OR `resource.attributes.deployment.environment.name` == "production"'
    );
  });

  it(`matches APM's sentinel or no environment for "Not defined"`, () => {
    expect(print('ENVIRONMENT_NOT_DEFINED')).toContain(
      // AND binds tighter than OR, so the composer needs no parentheses.
      '| WHERE `service.environment` == "ENVIRONMENT_NOT_DEFINED" OR `service.environment` IS NULL AND `resource.attributes.deployment.environment.name` IS NULL'
    );
  });
});
