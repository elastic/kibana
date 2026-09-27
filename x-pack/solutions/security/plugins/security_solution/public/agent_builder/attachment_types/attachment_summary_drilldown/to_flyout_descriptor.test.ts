/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { hasDrilldownIdentity, toFlyoutDescriptor } from './to_flyout_descriptor';

const INDICES = { alertsIndex: '.alerts-security.alerts-default', attacksIndex: '.attacks-*' };

const attachmentOf = (
  type: string,
  data: unknown,
  overrides: Partial<UnknownAttachment> = {}
): UnknownAttachment => ({ id: 'attachment-1', type, data, ...overrides });

/** `security.alert` stores the alert as JSON, and every field in it is an array. */
const alertAttachment = (fields: Record<string, unknown>) =>
  attachmentOf(SecurityAgentBuilderAttachments.alert, { alert: JSON.stringify(fields) });

describe('toFlyoutDescriptor', () => {
  describe('security.alert', () => {
    it('opens the document flyout for the alert the payload names', () => {
      const descriptor = toFlyoutDescriptor(
        alertAttachment({ _id: ['alert-1'], _index: ['.internal.alerts-1'], message: ['hello'] }),
        INDICES
      );

      expect(descriptor).toEqual({
        kind: 'document',
        documentId: 'alert-1',
        indexName: '.internal.alerts-1',
      });
    });

    it.each([
      ['the JSON does not parse', { alert: '{' }],
      ['the payload carries no alert', {}],
      ['the alert is not a string', { alert: { _id: ['alert-1'] } }],
    ])('stays read-only when %s', (_, data) => {
      expect(toFlyoutDescriptor(attachmentOf('security.alert', data), INDICES)).toBeNull();
    });

    it('stays read-only when the alert has no id', () => {
      expect(toFlyoutDescriptor(alertAttachment({ _index: ['.alerts-1'] }), INDICES)).toBeNull();
    });

    it('accepts scalar fields, since the payload is whatever the producer wrote', () => {
      const descriptor = toFlyoutDescriptor(
        alertAttachment({ _id: 'alert-1', _index: '.internal.alerts-1' }),
        INDICES
      );

      expect(descriptor).toEqual({
        kind: 'document',
        documentId: 'alert-1',
        indexName: '.internal.alerts-1',
      });
    });

    it('resolves the alert against the alerts pattern when it records no index', () => {
      const descriptor = toFlyoutDescriptor(alertAttachment({ _id: ['alert-1'] }), INDICES);

      expect(descriptor).toEqual({
        kind: 'documentFromPattern',
        documentId: 'alert-1',
        indexName: INDICES.alertsIndex,
      });
    });

    it('stays read-only with neither an index nor an alerts pattern to fall back to', () => {
      expect(toFlyoutDescriptor(alertAttachment({ _id: ['alert-1'] }), {})).toBeNull();
    });
  });

  it('has no drill-down for an alert batch, which names a set rather than one alert', () => {
    const descriptor = toFlyoutDescriptor(
      attachmentOf(SecurityAgentBuilderAttachments.alerts, { alertIds: ['alert-1'] }),
      INDICES
    );

    expect(descriptor).toBeNull();
  });

  describe('security.attack_discovery', () => {
    it('opens the attack flyout for the persisted document, not the payload id', () => {
      const descriptor = toFlyoutDescriptor(
        attachmentOf(
          SecurityAgentBuilderAttachments.attackDiscovery,
          { id: 'llm-generated-uuid', title: 'Impossible travel' },
          { origin: 'attack-doc-1' }
        ),
        INDICES
      );

      expect(descriptor).toEqual({
        kind: 'attack',
        attackId: 'attack-doc-1',
        indexName: INDICES.attacksIndex,
      });
    });

    it('stays read-only for an attack that was never persisted', () => {
      const descriptor = toFlyoutDescriptor(
        attachmentOf(SecurityAgentBuilderAttachments.attackDiscovery, { id: 'llm-uuid' }),
        INDICES
      );

      expect(descriptor).toBeNull();
    });
  });

  describe('security.rule', () => {
    it('opens the rule flyout by saved object id, which only the serialised rule carries', () => {
      const descriptor = toFlyoutDescriptor(
        attachmentOf(
          SecurityAgentBuilderAttachments.rule,
          { text: JSON.stringify({ id: 'rule-so-id', rule_id: 'rule-signature', name: 'A rule' }) },
          { origin: 'rule-signature' }
        ),
        INDICES
      );

      expect(descriptor).toEqual({ kind: 'rule', ruleId: 'rule-so-id' });
    });

    it('falls back to the origin when the producer stripped ids out of the payload', () => {
      // The rule-creation flows serialise the rule without its ids and keep identity on `origin`.
      const descriptor = toFlyoutDescriptor(
        attachmentOf(
          SecurityAgentBuilderAttachments.rule,
          { text: JSON.stringify({ name: 'A rule', type: 'query' }) },
          { origin: 'rule-so-id' }
        ),
        INDICES
      );

      expect(descriptor).toEqual({ kind: 'rule', ruleId: 'rule-so-id' });
    });

    it('prefers the serialised rule id over the origin, which may hold a signature', () => {
      const descriptor = toFlyoutDescriptor(
        attachmentOf(
          SecurityAgentBuilderAttachments.rule,
          { text: JSON.stringify({ id: 'rule-so-id', rule_id: 'rule-signature' }) },
          { origin: 'rule-signature' }
        ),
        INDICES
      );

      expect(descriptor).toEqual({ kind: 'rule', ruleId: 'rule-so-id' });
    });

    it('stays read-only for a rule that has not been saved yet', () => {
      const descriptor = toFlyoutDescriptor(
        attachmentOf(SecurityAgentBuilderAttachments.rule, {
          text: JSON.stringify({ name: 'Draft rule' }),
        }),
        INDICES
      );

      expect(descriptor).toBeNull();
    });
  });

  describe('security.entity', () => {
    const entityAttachment = (identifier: Record<string, unknown>) =>
      attachmentOf(SecurityAgentBuilderAttachments.entity, identifier);

    it.each([
      ['host', 'hostName', 'srv-file01'],
      ['user', 'userName', 'dev-user'],
      ['service', 'serviceName', 'checkout'],
    ])('opens the %s flyout', (identifierType, nameField, identifier) => {
      const descriptor = toFlyoutDescriptor(
        entityAttachment({ identifierType, identifier, entityStoreId: 'entity-id-1' }),
        INDICES
      );

      expect(descriptor).toEqual({
        kind: identifierType,
        [nameField]: identifier,
        entityId: 'entity-id-1',
        scopeId: expect.any(String),
      });
    });

    it('opens the generic entity flyout, which resolves by id alone', () => {
      const descriptor = toFlyoutDescriptor(
        entityAttachment({
          identifierType: 'generic',
          identifier: 'some-asset',
          entityStoreId: 'entity-id-1',
        }),
        INDICES
      );

      expect(descriptor).toEqual({
        kind: 'genericEntity',
        entityId: 'entity-id-1',
        scopeId: expect.any(String),
      });
    });

    it('opens a named entity by name alone, resolving the canonical id itself', () => {
      // `entityId` is optional on the host/user/service flyouts: they resolve it through the EUID
      // API, so a payload predating Entity Store v2 is still openable.
      const descriptor = toFlyoutDescriptor(
        entityAttachment({ identifierType: 'host', identifier: 'srv-file01' }),
        INDICES
      );

      expect(descriptor).toEqual({
        kind: 'host',
        hostName: 'srv-file01',
        entityId: undefined,
        scopeId: expect.any(String),
      });
    });

    it('stays read-only for a generic entity with no id, which has no name lookup', () => {
      const descriptor = toFlyoutDescriptor(
        entityAttachment({ identifierType: 'generic', identifier: 'some-asset' }),
        INDICES
      );

      expect(descriptor).toBeNull();
    });

    it('stays read-only for a multi-entity attachment, which names no single flyout', () => {
      const descriptor = toFlyoutDescriptor(
        entityAttachment({
          entities: [
            { identifierType: 'host', identifier: 'srv-file01', entityStoreId: 'entity-id-1' },
            { identifierType: 'user', identifier: 'dev-user', entityStoreId: 'entity-id-2' },
          ],
        }),
        INDICES
      );

      expect(descriptor).toBeNull();
    });

    it('opens the flyout for a one-entity list, which is unambiguous', () => {
      const descriptor = toFlyoutDescriptor(
        entityAttachment({
          entities: [
            { identifierType: 'user', identifier: 'dev-user', entityStoreId: 'entity-id-2' },
          ],
        }),
        INDICES
      );

      expect(descriptor).toEqual(expect.objectContaining({ kind: 'user', userName: 'dev-user' }));
    });
  });

  it('stays read-only for a type the summary does not drill into', () => {
    expect(toFlyoutDescriptor(attachmentOf('security.exception', {}), INDICES)).toBeNull();
  });

  describe('hasDrilldownIdentity', () => {
    it('accepts a payload that identifies something, whatever the environment supplies', () => {
      expect(
        hasDrilldownIdentity(alertAttachment({ _id: ['alert-1'], _index: ['.alerts-1'] }))
      ).toBe(true);
    });

    it('accepts an attack, whose index is only known once the data view loads', () => {
      // The check must not depend on the index, or every attack row would look inert on first paint.
      expect(
        hasDrilldownIdentity(
          attachmentOf(SecurityAgentBuilderAttachments.attackDiscovery, {}, { origin: 'attack-1' })
        )
      ).toBe(true);
    });

    it('rejects a payload that identifies nothing', () => {
      expect(hasDrilldownIdentity(alertAttachment({ message: ['no ids here'] }))).toBe(false);
    });

    it('rejects an attack that was never persisted', () => {
      expect(
        hasDrilldownIdentity(
          attachmentOf(SecurityAgentBuilderAttachments.attackDiscovery, { id: 'llm-uuid' })
        )
      ).toBe(false);
    });
  });
});
