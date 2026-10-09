import type { FieldMap } from '@kbn/alerts-as-data-utils';
/**
 * Field map for attack discovery alerts - defines the Elasticsearch mappings
 * for fields stored in attack discovery alert documents.
 *
 * CANONICAL COPY. A deliberate fork of this map lives at
 * `x-pack/solutions/security/packages/kbn-discoveries/impl/attack_discovery/alert_fields/alert_field_map.ts`,
 * kept so that `@kbn/discoveries` can eventually become a standalone package. Do NOT
 * de-duplicate the two copies.
 *
 * Both copies are installed into the SAME component template
 * (`.adhoc.alerts-security.attack.discovery.alerts-mappings`) — `elastic_assistant` installs
 * this one, the `discoveries` plugin installs the fork — so if they drift, the installed
 * mappings depend on plugin install order. Every change here MUST be mirrored in the fork,
 * and vice versa.
 *
 * Parity is enforced by
 * `x-pack/solutions/security/plugins/discoveries/server/attack_discovery_index_parity.test.ts`.
 */
export declare const attackDiscoveryAlertFieldMap: FieldMap;
