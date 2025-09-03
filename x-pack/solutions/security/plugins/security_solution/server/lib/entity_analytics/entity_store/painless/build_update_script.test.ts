/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { buildUpdateEntityPainlessScript } from './build_update_script';

describe('buildUpdateEntityPainlessScript', () => {
  it('returns empty if no update', () => {
    const script = buildUpdateEntityPainlessScript({
      entity: {
        id: '1',
      },
    });

    expect(script).toBe('');
  });

  it('assigns entity fields', () => {
    const script = buildUpdateEntityPainlessScript({
      entity: {
        id: '1',
        type: 'test-type',
        category: 'test-category',
      },
    });

    expect(script).toBe(
      `ctx._source.entity['type'] = 'test-type';` +
        `ctx._source.entity['category'] = 'test-category';`
    );
  });

  it('assigns nested entity fields', () => {
    const script = buildUpdateEntityPainlessScript({
      entity: {
        id: '1',
        attributes: {
          Storage_class: 'cold',
          Managed: true,
        },
      },
    });

    expect(script).toBe(
      `ctx._source.entity['attributes'] = ctx._source.entity['attributes'] == null ? [:] : ctx._source.entity['attributes'];` +
        `ctx._source.entity['attributes']['Storage_class'] = 'cold';` +
        `ctx._source.entity['attributes']['Managed'] = true;`
    );
  });

  it('full example', () => {
    const script = buildUpdateEntityPainlessScript({
      entity: {
        id: '1',
        type: 'test-type',
        category: 'test-category',
        attributes: {
          Storage_class: 'cold',
          Managed: true,
        },
        lifecycle: {
          First_seen: '2024-08-30T11:03:33.594Z',
        },
        behavior: {
          Brute_force_victim: false,
          Used_usb_device: true,
        },
      },
    });

    expect(script).toBe(
      `ctx._source.entity['type'] = 'test-type';` +
        `ctx._source.entity['category'] = 'test-category';` +
        `ctx._source.entity['attributes'] = ctx._source.entity['attributes'] == null ? [:] : ctx._source.entity['attributes'];` +
        `ctx._source.entity['attributes']['Storage_class'] = 'cold';` +
        `ctx._source.entity['attributes']['Managed'] = true;` +
        `ctx._source.entity['lifecycle'] = ctx._source.entity['lifecycle'] == null ? [:] : ctx._source.entity['lifecycle'];` +
        `ctx._source.entity['lifecycle']['First_seen'] = '2024-08-30T11:03:33.594Z';` +
        `ctx._source.entity['behavior'] = ctx._source.entity['behavior'] == null ? [:] : ctx._source.entity['behavior'];` +
        `ctx._source.entity['behavior']['Brute_force_victim'] = false;` +
        `ctx._source.entity['behavior']['Used_usb_device'] = true;`
    );
  });
});
