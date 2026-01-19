/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildUpdateEntityPainlessScript } from './build_update_script';
import type { FieldDescription } from '../installation/types';
import { collectValues, newestValue } from '../entity_definitions/entity_descriptions/field_utils';

describe('buildUpdateEntityPainlessScript', () => {
  it('returns empty if no update', () => {
    const script = buildUpdateEntityPainlessScript(toMap([newest('entity.id', 'abc')]));

    expect(script).toBe('');
  });

  it('assigns entity fields', () => {
    const script = buildUpdateEntityPainlessScript(
      toMap([
        newest('entity.id', '1'),
        newest('entity.type', 'test-type'),
        newest('entity.sub_type', 'test-sub_type'),
      ])
    );

    expect(script).toBe(
      `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
        `ctx._source['entity']['type'] = 'test-type';` +
        `ctx._source['entity']['sub_type'] = 'test-sub_type';`
    );
  });

  it('assigns nested entity fields', () => {
    const script = buildUpdateEntityPainlessScript(
      toMap([
        newest('entity.id', '1'),
        newest('entity.attributes.storage_class', 'cold'),
        newest('entity.attributes.managed', true),
      ])
    );

    expect(script).toBe(
      `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
        `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
        `ctx._source['entity']['attributes']['storage_class'] = 'cold';` +
        `ctx._source['entity']['attributes']['managed'] = true;`
    );
  });

  it('handles collect with arrays', () => {
    const script = buildUpdateEntityPainlessScript(
      toMap([
        newest('entity.id', '1'),
        newest('entity.attributes.storage_class', 'cold'),
        newest('entity.attributes.managed', true),
        collect('entity.relationships.depends_on', ['okta', 'jamf']),
      ])
    );

    expect(script).toBe(
      `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
        `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
        `ctx._source['entity']['attributes']['storage_class'] = 'cold';` +
        `ctx._source['entity']['attributes']['managed'] = true;` +
        `ctx._source['entity']['relationships'] = ctx._source['entity']['relationships'] == null ? [:] : ctx._source['entity']['relationships'];` +
        `def collectMap = [:];` +
        `collectMap['entity.relationships.depends_on'] = new HashSet();` +
        `collectMap['entity.relationships.depends_on'].addAll(['okta', 'jamf']);` +
        `if (!(ctx?._source['entity']['relationships']['depends_on'] == null || ((ctx._source['entity']['relationships']['depends_on'] instanceof Collection || ctx._source['entity']['relationships']['depends_on'] instanceof String || ctx._source['entity']['relationships']['depends_on'] instanceof Map) && ctx._source['entity']['relationships']['depends_on'].isEmpty()))) {` +
        `  if(ctx._source['entity']['relationships']['depends_on'] instanceof Collection) {` +
        `    collectMap['entity.relationships.depends_on'].addAll(ctx._source['entity']['relationships']['depends_on']);` +
        `  } else {` +
        `    collectMap['entity.relationships.depends_on'].add(ctx._source['entity']['relationships']['depends_on']);` +
        `  }` +
        `}` +
        `ctx._source['entity']['relationships']['depends_on'] = new ArrayList(collectMap['entity.relationships.depends_on']).subList(0, (int) Math.min(10, collectMap['entity.relationships.depends_on'].size()));`
    );
  });

  it('handles collect with single values', () => {
    const script = buildUpdateEntityPainlessScript(
      toMap([
        newest('entity.id', '1'),
        newest('entity.attributes.storage_class', 'cold'),
        newest('entity.attributes.managed', true),
        collect('entity.relationships.depends_on', 'okta'),
      ])
    );

    expect(script).toBe(
      `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
        `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
        `ctx._source['entity']['attributes']['storage_class'] = 'cold';` +
        `ctx._source['entity']['attributes']['managed'] = true;` +
        `ctx._source['entity']['relationships'] = ctx._source['entity']['relationships'] == null ? [:] : ctx._source['entity']['relationships'];` +
        `def collectMap = [:];` +
        `collectMap['entity.relationships.depends_on'] = new HashSet();` +
        `collectMap['entity.relationships.depends_on'].add('okta');` +
        `if (!(ctx?._source['entity']['relationships']['depends_on'] == null || ((ctx._source['entity']['relationships']['depends_on'] instanceof Collection || ctx._source['entity']['relationships']['depends_on'] instanceof String || ctx._source['entity']['relationships']['depends_on'] instanceof Map) && ctx._source['entity']['relationships']['depends_on'].isEmpty()))) {` +
        `  if(ctx._source['entity']['relationships']['depends_on'] instanceof Collection) {` +
        `    collectMap['entity.relationships.depends_on'].addAll(ctx._source['entity']['relationships']['depends_on']);` +
        `  } else {` +
        `    collectMap['entity.relationships.depends_on'].add(ctx._source['entity']['relationships']['depends_on']);` +
        `  }` +
        `}` +
        `ctx._source['entity']['relationships']['depends_on'] = new ArrayList(collectMap['entity.relationships.depends_on']).subList(0, (int) Math.min(10, collectMap['entity.relationships.depends_on'].size()));`
    );
  });

  it('full example', () => {
    const script = buildUpdateEntityPainlessScript(
      toMap([
        collect('user.domain', ['val1', 'val2']),
        newest('entity.id', '1'),
        newest('entity.type', 'test-type'),
        newest('entity.sub_type', 'test-sub_type'),
        newest('entity.attributes.storage_class', 'cold'),
        newest('entity.attributes.managed', true),
        collect('entity.relationships.depends_on', ['okta', 'jamf']),
        collect('entity.relationships.owned_by', 'rmf'),
        newest('entity.lifecyle.first_seen', '2024-08-30T11:03:33.594Z'),
        newest('entity.behaviors.used_usb_device', false),
        newest('host.macAddress', 'cf:45:2e:a3:20:96'),
      ])
    );

    expect(script).toBe(
      `ctx._source['user'] = ctx._source['user'] == null ? [:] : ctx._source['user'];` +
        `def collectMap = [:];` +
        `collectMap['user.domain'] = new HashSet();` +
        `collectMap['user.domain'].addAll(['val1', 'val2']);` +
        `if (!(ctx?._source['user']['domain'] == null || ((ctx._source['user']['domain'] instanceof Collection || ctx._source['user']['domain'] instanceof String || ctx._source['user']['domain'] instanceof Map) && ctx._source['user']['domain'].isEmpty()))) {` +
        `  if(ctx._source['user']['domain'] instanceof Collection) {` +
        `    collectMap['user.domain'].addAll(ctx._source['user']['domain']);` +
        `  } else {` +
        `    collectMap['user.domain'].add(ctx._source['user']['domain']);` +
        `  }` +
        `}` +
        `ctx._source['user']['domain'] = new ArrayList(collectMap['user.domain']).subList(0, (int) Math.min(10, collectMap['user.domain'].size()));` +
        `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
        `ctx._source['entity']['type'] = 'test-type';` +
        `ctx._source['entity']['sub_type'] = 'test-sub_type';` +
        `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
        `ctx._source['entity']['attributes']['storage_class'] = 'cold';` +
        `ctx._source['entity']['attributes']['managed'] = true;` +
        `ctx._source['entity']['relationships'] = ctx._source['entity']['relationships'] == null ? [:] : ctx._source['entity']['relationships'];` +
        `collectMap['entity.relationships.depends_on'] = new HashSet();` +
        `collectMap['entity.relationships.depends_on'].addAll(['okta', 'jamf']);` +
        `if (!(ctx?._source['entity']['relationships']['depends_on'] == null || ((ctx._source['entity']['relationships']['depends_on'] instanceof Collection || ctx._source['entity']['relationships']['depends_on'] instanceof String || ctx._source['entity']['relationships']['depends_on'] instanceof Map) && ctx._source['entity']['relationships']['depends_on'].isEmpty()))) {` +
        `  if(ctx._source['entity']['relationships']['depends_on'] instanceof Collection) {` +
        `    collectMap['entity.relationships.depends_on'].addAll(ctx._source['entity']['relationships']['depends_on']);` +
        `  } else {` +
        `    collectMap['entity.relationships.depends_on'].add(ctx._source['entity']['relationships']['depends_on']);` +
        `  }` +
        `}` +
        `ctx._source['entity']['relationships']['depends_on'] = new ArrayList(collectMap['entity.relationships.depends_on']).subList(0, (int) Math.min(10, collectMap['entity.relationships.depends_on'].size()));` +
        `collectMap['entity.relationships.owned_by'] = new HashSet();` +
        `collectMap['entity.relationships.owned_by'].add('rmf');` +
        `if (!(ctx?._source['entity']['relationships']['owned_by'] == null || ((ctx._source['entity']['relationships']['owned_by'] instanceof Collection || ctx._source['entity']['relationships']['owned_by'] instanceof String || ctx._source['entity']['relationships']['owned_by'] instanceof Map) && ctx._source['entity']['relationships']['owned_by'].isEmpty()))) {` +
        `  if(ctx._source['entity']['relationships']['owned_by'] instanceof Collection) {` +
        `    collectMap['entity.relationships.owned_by'].addAll(ctx._source['entity']['relationships']['owned_by']);` +
        `  } else {` +
        `    collectMap['entity.relationships.owned_by'].add(ctx._source['entity']['relationships']['owned_by']);` +
        `  }` +
        `}` +
        `ctx._source['entity']['relationships']['owned_by'] = new ArrayList(collectMap['entity.relationships.owned_by']).subList(0, (int) Math.min(10, collectMap['entity.relationships.owned_by'].size()));` +
        `ctx._source['entity']['lifecyle'] = ctx._source['entity']['lifecyle'] == null ? [:] : ctx._source['entity']['lifecyle'];` +
        `ctx._source['entity']['lifecyle']['first_seen'] = '2024-08-30T11:03:33.594Z';` +
        `ctx._source['entity']['behaviors'] = ctx._source['entity']['behaviors'] == null ? [:] : ctx._source['entity']['behaviors'];` +
        `ctx._source['entity']['behaviors']['used_usb_device'] = false;` +
        `ctx._source['host'] = ctx._source['host'] == null ? [:] : ctx._source['host'];` +
        `ctx._source['host']['macAddress'] = 'cf:45:2e:a3:20:96';`
    );
  });
});

function collect(
  name: string,
  value: unknown
): FieldDescription & {
  value: unknown;
} {
  return {
    value,
    ...collectValues({
      source: name,
    }),
  };
}

function newest(name: string, value: unknown): FieldDescription & { value: unknown } {
  return {
    value,
    ...newestValue({
      source: name,
    }),
  };
}

function toMap(fields: (FieldDescription & { value: unknown })[]) {
  return fields.reduce((obj, field) => {
    obj[field.source] = field;
    return obj;
  }, {} as Record<string, FieldDescription & { value: unknown }>);
}
