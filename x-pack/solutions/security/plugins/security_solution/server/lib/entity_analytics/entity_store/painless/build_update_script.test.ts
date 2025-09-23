/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedObject } from '@kbn/std';
import { buildUpdateEntityPainlessScript } from './build_update_script';

describe('buildUpdateEntityPainlessScript', () => {
  it('returns empty if no update', () => {
    const script = buildUpdateEntityPainlessScript(
      getFlattenedObject({
        entity: {
          id: '1',
        },
      })
    );

    expect(script).toBe('');
  });

  it('assigns entity fields', () => {
    const script = buildUpdateEntityPainlessScript(
      getFlattenedObject({
        entity: {
          id: '1',
          type: 'test-type',
          sub_type: 'test-sub_type',
        },
      })
    );

    expect(script).toBe(
      `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
        `ctx._source['entity']['type'] = 'test-type';` +
        `ctx._source['entity']['sub_type'] = 'test-sub_type';`
    );
  });

  it('assigns nested entity fields', () => {
    const script = buildUpdateEntityPainlessScript(
      getFlattenedObject({
        entity: {
          id: '1',
          attributes: {
            storage_class: 'cold',
            managed: true,
          },
        },
      })
    );

    expect(script).toBe(
      `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
        `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
        `ctx._source['entity']['attributes']['storage_class'] = 'cold';` +
        `ctx._source['entity']['attributes']['managed'] = true;`
    );
  });

  it('full example', () => {
    const script = buildUpdateEntityPainlessScript(
      getFlattenedObject({
        user: {
          domain: ['val1', 'val2'],
        },
        entity: {
          id: '1',
          type: 'test-type',
          sub_type: 'test-sub_type',
          attributes: {
            storage_class: 'cold',
            managed: true,
          },
          lifecycle: {
            first_seen: '2024-08-30T11:03:33.594Z',
          },
          behavior: {
            brute_force_victim: false,
            used_usb_device: true,
          },
        },
        host: {
          macAddress: 'cf:45:2e:a3:20:96',
        },
      })
    );

    expect(script).toBe(
      `ctx._source['user'] = ctx._source['user'] == null ? [:] : ctx._source['user'];` +
        `ctx._source['user']['domain'] = ['val1', 'val2'];` +
        `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
        `ctx._source['entity']['type'] = 'test-type';` +
        `ctx._source['entity']['sub_type'] = 'test-sub_type';` +
        `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
        `ctx._source['entity']['attributes']['storage_class'] = 'cold';` +
        `ctx._source['entity']['attributes']['managed'] = true;` +
        `ctx._source['entity']['lifecycle'] = ctx._source['entity']['lifecycle'] == null ? [:] : ctx._source['entity']['lifecycle'];` +
        `ctx._source['entity']['lifecycle']['first_seen'] = '2024-08-30T11:03:33.594Z';` +
        `ctx._source['entity']['behavior'] = ctx._source['entity']['behavior'] == null ? [:] : ctx._source['entity']['behavior'];` +
        `ctx._source['entity']['behavior']['brute_force_victim'] = false;` +
        `ctx._source['entity']['behavior']['used_usb_device'] = true;` +
        `ctx._source['host'] = ctx._source['host'] == null ? [:] : ctx._source['host'];` +
        `ctx._source['host']['macAddress'] = 'cf:45:2e:a3:20:96';`
    );
  });

  it('small example', () => {
    const script = buildUpdateEntityPainlessScript(
      getFlattenedObject({
        entity: {
          id: 'entity-test',
          attributes: {
            Privileged: true,
          },
        },
      })
    );

    expect(script).toBe(
      `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
        `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
        `ctx._source['entity']['attributes']['Privileged'] = true;`
    );
  });
});
