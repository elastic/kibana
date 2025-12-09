/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  GROUPED_ITEM_TEST_ID,
  GROUPED_ITEM_TITLE_TEST_ID_TEXT,
  GROUPED_ITEM_TITLE_TEST_ID_LINK,
  GROUPED_ITEM_TIMESTAMP_TEST_ID,
  GROUPED_ITEM_ACTOR_TEST_ID,
  GROUPED_ITEM_TARGET_TEST_ID,
  GROUPED_ITEM_IP_TEST_ID,
  GROUPED_ITEM_SKELETON_TEST_ID,
  GROUPED_ITEM_GEO_TEST_ID,
} from '../../test_ids';
import { GroupedItem } from './grouped_item';
import { formatDate } from '@elastic/eui';
import { LIST_ITEM_DATE_FORMAT } from './parts/timestamp_row';
import type { EntityOrEventItem } from './types';

describe('<GroupedItem />', () => {
  describe('render items', () => {
    it('renders entity item with full details', () => {
      const timestamp = Date.now();
      const { queryByTestId, getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            icon: 'node',
            timestamp,
            risk: 55,
            ips: ['5.5.5.5'],
            countryCodes: ['US'],
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_SKELETON_TEST_ID)).not.toBeInTheDocument();

      expect(getByTestId(GROUPED_ITEM_TITLE_TEST_ID_TEXT).textContent).toBe('entity-1');
      expect(getByTestId(GROUPED_ITEM_TIMESTAMP_TEST_ID).textContent).toBe(
        formatDate(timestamp, `@ ${LIST_ITEM_DATE_FORMAT}`)
      );
      expect(getByTestId(GROUPED_ITEM_IP_TEST_ID).textContent).toContain('IP: 5.5.5.5');
      expect(getByTestId(GROUPED_ITEM_GEO_TEST_ID).textContent).toBe(
        'Geo:  🇺🇸 United States of America'
      );
    });

    it('renders event item with full details', () => {
      const timestamp = Date.now();
      const { getByTestId, queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'event',
            id: 'event-id',
            action: 'process_start',
            timestamp,
            actor: { id: 'a1', label: 'user1', icon: 'user' },
            target: { id: 'p1', label: 'proc.exe', icon: 'document' },
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_SKELETON_TEST_ID)).not.toBeInTheDocument();

      expect(getByTestId(GROUPED_ITEM_TITLE_TEST_ID_LINK).textContent).toBe('process_start');
      expect(getByTestId(GROUPED_ITEM_TIMESTAMP_TEST_ID).textContent).toBe(
        formatDate(timestamp, `@ ${LIST_ITEM_DATE_FORMAT}`)
      );
      expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toContain('user1');
      expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toContain('proc.exe');
    });

    it('renders alert item with full details', () => {
      const timestamp = Date.now();
      const { getByTestId, queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'alert',
            id: 'alert-id',
            action: 'alert_action',
            timestamp,
            actor: { id: 'host-1', label: 'host', icon: 'storage' },
            target: { id: 'p1', label: 'proc.exe', icon: 'document' },
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_SKELETON_TEST_ID)).not.toBeInTheDocument();

      expect(getByTestId(GROUPED_ITEM_TITLE_TEST_ID_LINK).textContent).toBe('alert_action');
      expect(getByTestId(GROUPED_ITEM_TIMESTAMP_TEST_ID).textContent).toBe(
        formatDate(timestamp, `@ ${LIST_ITEM_DATE_FORMAT}`)
      );
      expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toContain('host');
      expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toContain('proc.exe');
    });
  });

  describe('display name edge cases', () => {
    describe('entity', () => {
      it('falls back to entity id when entity label is missing', () => {
        const entityId = 'entity-id';
        const { getByTestId } = render(<GroupedItem item={{ itemType: 'entity', id: entityId }} />);
        expect(getByTestId(GROUPED_ITEM_TITLE_TEST_ID_TEXT).textContent).toBe(entityId);
      });
    });

    describe('event', () => {
      it('falls back to event id when event action is missing', () => {
        const eventId = 'event-id';
        const { getByTestId } = render(<GroupedItem item={{ itemType: 'event', id: eventId }} />);
        expect(getByTestId(GROUPED_ITEM_TITLE_TEST_ID_LINK).textContent).toBe(eventId);
      });
    });

    describe('alert', () => {
      it('falls back to alert id when alert action is missing', () => {
        const alertId = 'alert-id';
        const { getByTestId } = render(<GroupedItem item={{ itemType: 'alert', id: alertId }} />);
        expect(getByTestId(GROUPED_ITEM_TITLE_TEST_ID_LINK).textContent).toBe(alertId);
      });
    });
  });

  describe('ActorsRow conditional rendering', () => {
    it('does not render ActorsRow for entity type even with actor and target present', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={
            {
              itemType: 'entity',
              id: 'e1',
              label: 'entity-1',
              actor: { id: 'a1', label: 'actor' },
              target: { id: 't1', label: 'target' },
            } as any // eslint-disable-line @typescript-eslint/no-explicit-any
          } // Type assertion needed for test case
        />
      );

      expect(queryByTestId(GROUPED_ITEM_ACTOR_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_TARGET_TEST_ID)).not.toBeInTheDocument();
    });

    it('does not render ActorsRow for event when actor is missing', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'event',
            id: 'event-1',
            action: 'test_action',
            target: { id: 't1', label: 'target' },
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_ACTOR_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_TARGET_TEST_ID)).not.toBeInTheDocument();
    });

    it('does not render ActorsRow for event when target is missing', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'event',
            id: 'event-1',
            action: 'test_action',
            actor: { id: 'a1', label: 'actor' },
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_ACTOR_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_TARGET_TEST_ID)).not.toBeInTheDocument();
    });

    it('does not render ActorsRow for alert when actor is missing', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'alert',
            id: 'alert-1',
            action: 'test_action',
            target: { id: 't1', label: 'target' },
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_ACTOR_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_TARGET_TEST_ID)).not.toBeInTheDocument();
    });

    it('does not render ActorsRow for alert when target is missing', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'alert',
            id: 'alert-1',
            action: 'test_action',
            actor: { id: 'a1', label: 'actor' },
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_ACTOR_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_TARGET_TEST_ID)).not.toBeInTheDocument();
    });

    it('renders ActorsRow for event with both actor and target present', () => {
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'event',
            id: 'event-1',
            action: 'test_action',
            actor: { id: 'a1', label: 'actor' },
            target: { id: 't1', label: 'target' },
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toBe('actor');
      expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('target');
    });

    it('renders ActorsRow for alert with both actor and target present', () => {
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'alert',
            id: 'alert-1',
            action: 'test_action',
            actor: { id: 'a1', label: 'actor' },
            target: { id: 't1', label: 'target' },
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toBe('actor');
      expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('target');
    });

    it('renders actor id gracefully with missing label', () => {
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'event',
            id: 'event-1',
            action: 'test_action',
            actor: { id: 'a1' }, // No label
            target: { id: 't1', label: 'target' },
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toBe('a1');
      expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('target');
    });

    it('renders target id gracefully with missing label', () => {
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'event',
            id: 'event-1',
            action: 'test_action',
            actor: { id: 'a1', label: 'actor' },
            target: { id: 't1' }, // No label
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toBe('actor');
      expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('t1');
    });

    it('renders actor and target with only id when missing both labels', () => {
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'event',
            id: 'event-1',
            action: 'test_action',
            actor: { id: 'a1' }, // Only id
            target: { id: 't1' }, // Only id
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toBe('a1');
      expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('t1');
    });

    it('renders actor and target names with optional icon when provided', () => {
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'event',
            id: 'event-1',
            action: 'test_action',
            actor: { id: 'a1', label: 'actor', icon: 'user' },
            target: { id: 't1', label: 'target', icon: 'document' },
          }}
        />
      );

      const actorBadge = getByTestId(GROUPED_ITEM_ACTOR_TEST_ID);
      const targetBadge = getByTestId(GROUPED_ITEM_TARGET_TEST_ID);

      expect(getByTestId(GROUPED_ITEM_ACTOR_TEST_ID).textContent).toBe('actor');
      expect(getByTestId(GROUPED_ITEM_TARGET_TEST_ID).textContent).toBe('target');

      expect(actorBadge.querySelector('[data-euiicon-type="user"]')).toBeInTheDocument();
      expect(targetBadge.querySelector('[data-euiicon-type="document"]')).toBeInTheDocument();
    });
  });

  describe('Panel alert styling', () => {
    const dangerColor = '#C61E25'; // EUI danger color

    it('applies alert styling when item type is alert', () => {
      const { container } = render(
        <GroupedItem
          item={{
            itemType: 'alert',
            id: 'alert-1',
            action: 'test_action',
          }}
        />
      );

      // Check that Panel receives isAlert prop
      const panel = container.querySelector(`[data-test-subj="${GROUPED_ITEM_TEST_ID}"]`);
      expect(panel).toHaveStyle(`border-left: 7px solid ${dangerColor}`);
    });

    it('does not apply alert styling when item type is event', () => {
      const { container } = render(
        <GroupedItem
          item={{
            itemType: 'event',
            id: 'event-1',
            action: 'test_action',
          }}
        />
      );

      const panel = container.querySelector(`[data-test-subj="${GROUPED_ITEM_TEST_ID}"]`);
      expect(panel).not.toHaveStyle(`border-left: 7px solid ${dangerColor}`);
    });

    it('does not apply alert styling when item type is entity', () => {
      const { container } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'entity-1',
            label: 'test_entity',
          }}
        />
      );

      const panel = container.querySelector(`[data-test-subj="${GROUPED_ITEM_TEST_ID}"]`);
      expect(panel).not.toHaveStyle(`border-left: 7px solid ${dangerColor}`);
    });
  });

  describe('geolocation', () => {
    it('renders geolocation label followed by country emoji flag and name', () => {
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            countryCodes: ['il'],
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_GEO_TEST_ID).textContent).toBe('Geo:  🇮🇱 Israel');
    });

    it('does not render geolocation info when countryCode is undefined', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            countryCodes: undefined,
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_GEO_TEST_ID)).not.toBeInTheDocument();
    });

    it('does not render geo info when countryCode is empty string', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            countryCodes: [''],
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_GEO_TEST_ID)).not.toBeInTheDocument();
    });

    it('handles invalid country codes gracefully', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            countryCodes: ['INVALID'],
          }}
        />
      );

      // Should not render if flag/name lookup fails
      expect(queryByTestId(GROUPED_ITEM_GEO_TEST_ID)).not.toBeInTheDocument();
    });

    it('handles uppercase, lowercase or mixed case country codes', () => {
      const item: EntityOrEventItem = {
        itemType: 'entity',
        id: 'e1',
        label: 'entity-1',
      };

      const { getByTestId, rerender } = render(
        <GroupedItem
          item={{
            ...item,
            countryCodes: ['us'], // lowercase
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_GEO_TEST_ID).textContent).toBe(
        'Geo:  🇺🇸 United States of America'
      );

      rerender(<GroupedItem item={{ ...item, countryCodes: ['US'] }} />); // uppercase
      expect(getByTestId(GROUPED_ITEM_GEO_TEST_ID).textContent).toBe(
        'Geo:  🇺🇸 United States of America'
      );

      rerender(<GroupedItem item={{ ...item, countryCodes: ['uS'] }} />); // mixed case
      expect(getByTestId(GROUPED_ITEM_GEO_TEST_ID).textContent).toBe(
        'Geo:  🇺🇸 United States of America'
      );
    });
  });

  describe('IP address format variations', () => {
    it('does not render IP when ip is undefined', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            ips: undefined,
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_IP_TEST_ID)).not.toBeInTheDocument();
    });

    it('does not render IP when ip is empty string', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            ips: [''],
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_IP_TEST_ID)).not.toBeInTheDocument();
    });

    it('renders IPv4 address', () => {
      const ipv4 = '192.168.1.1';
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            ips: [ipv4],
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_IP_TEST_ID).textContent).toContain(`IP: ${ipv4}`);
    });

    it('renders first IP address when ip is an array', () => {
      const ipArray = ['192.168.1.1', '10.0.0.1'];
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            ips: ipArray,
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_IP_TEST_ID).textContent).toContain(`IP: ${ipArray[0]}`);
    });

    it('does not render IP when ip is an empty array', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            ips: [],
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_IP_TEST_ID)).not.toBeInTheDocument();
    });

    it('does not render IP when ip array contains only empty strings', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            ips: ['', ''],
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_IP_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('country code format variations', () => {
    it('renders first country code when countryCode is an array', () => {
      const countryArray = ['US', 'IL'];
      const { getByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            countryCodes: countryArray,
          }}
        />
      );

      expect(getByTestId(GROUPED_ITEM_GEO_TEST_ID).textContent).toBe(
        'Geo:  🇺🇸 United States of America'
      );
    });

    it('does not render geolocation when countryCode is an empty array', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            countryCodes: [],
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_GEO_TEST_ID)).not.toBeInTheDocument();
    });

    it('does not render geolocation when countryCode array contains only empty strings', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
            countryCodes: ['', ''],
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_GEO_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('loading state edge cases', () => {
    it('renders skeleton when isLoading is true and item is undefined', () => {
      const { queryByTestId } = render(<GroupedItem isLoading />);

      expect(queryByTestId(GROUPED_ITEM_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_SKELETON_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_TITLE_TEST_ID_TEXT)).not.toBeInTheDocument();
    });

    it('renders skeleton when isLoading is true even with item provided', () => {
      const { queryByTestId } = render(
        <GroupedItem
          isLoading
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_SKELETON_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_TITLE_TEST_ID_TEXT)).not.toBeInTheDocument();
    });

    it('does not render skeleton when isLoading is false', () => {
      const { queryByTestId } = render(
        <GroupedItem
          isLoading={false}
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_SKELETON_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_TITLE_TEST_ID_TEXT)).toBeInTheDocument();
    });

    it('does not render skeleton when isLoading is undefined and defaults to false', () => {
      const { queryByTestId } = render(
        <GroupedItem
          item={{
            itemType: 'entity',
            id: 'e1',
            label: 'entity-1',
          }}
        />
      );

      expect(queryByTestId(GROUPED_ITEM_TEST_ID)).toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_SKELETON_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(GROUPED_ITEM_TITLE_TEST_ID_TEXT)).toBeInTheDocument();
    });
  });

  describe('memo behavior and component optimization', () => {
    it('should have displayName set correctly', () => {
      expect(GroupedItem.displayName).toBe('GroupedItem');
    });
  });
});
