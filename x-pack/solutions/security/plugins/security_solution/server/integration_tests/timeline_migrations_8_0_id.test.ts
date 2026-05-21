/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';

import {
  createTestServers,
  getSupertest,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import {
  noteSavedObjectType,
  pinnedEventSavedObjectType,
  timelineSavedObjectType,
} from '../lib/timeline/saved_object_mappings';
import { TIMELINE_ID_REF_NAME } from '../lib/timeline/constants';

const logFilePath = Path.join(__dirname, 'timeline_migrations_8_0_id.log');

const SPACE_ID = 'awesome-space';

// The pre-8.0.0 space-prefixed timeline savedObjectId, used as the legacy id
// the resolve route is queried with.
const OLD_TIMELINE_ID = '1e2e9850-25f8-11ec-a981-b77847c6ef30';

// The post-8.0.0 timeline savedObjectId that the legacy id resolves to via
// the legacy-url-alias the 8.0.0 namespace conversion migration would have
// produced for a `multiple-isolated` saved object type.
const NEW_TIMELINE_ID = 'a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6';

const NOTE_ID_1 = '2d230670-25f8-11ec-a981-b77847c6ef30';
const NOTE_ID_2 = '323df0c0-25f8-11ec-a981-b77847c6ef30';
const PINNED_EVENT_ID = '2694b600-25f8-11ec-a981-b77847c6ef30';

const MIGRATED_EVENT_ID = 'StU_UXwBAowmaxx6YdiS';

// legacy-url-alias SO id format produced by the 8.0.0 namespace conversion:
// `${targetNamespace}:${targetType}:${sourceId}`
const LEGACY_ALIAS_ID = `${SPACE_ID}:${timelineSavedObjectType}:${OLD_TIMELINE_ID}`;

const resolveUrl = `/s/${SPACE_ID}/api/timeline/resolve`;

interface ResolvedTimeline {
  outcome: string;
  alias_target_id?: string;
  alias_purpose?: string;
  timeline: {
    title: string;
    savedObjectId: string;
    notes?: Array<{ eventId?: string; timelineId?: string }>;
    pinnedEventsSaveObject?: Array<{ eventId?: string; timelineId?: string }>;
  };
}

describe('Timeline saved-object migrations — 8.0 id alias', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: { license: 'trial' },
        kbn: {
          logging: {
            appenders: {
              file: {
                type: 'file',
                fileName: logFilePath,
                layout: { type: 'json' },
              },
            },
            root: { level: 'warn' },
          },
          cliArgs: { oss: false },
        },
      },
    });

    esServer = await startES();
    kibanaServer = await startKibana();

    // Replicate the post-8.0.0 namespace conversion state directly via the SO
    // repository instead of seeding a legacy `.kibana_1` index. Kibana 9.x's
    // migration framework refuses to upgrade from versions older than 8.18.0
    // (see runV2Migration in saved-objects/migration-server-internal), so the
    // pre-8.0 archive cannot be replayed against current Kibana.
    //
    // Mirrors the approach used in resolve_read_rules.ts (security solution
    // FTR) for the equivalent alert-resolve scenario.
    //
    // The 'space' type is registered as `hidden: true` by the spaces plugin, so
    // it must be opted into the internal repository explicitly.
    const soRepo = kibanaServer.coreStart.savedObjects.createInternalRepository(['space']);

    // Create the awesome-space space so the /s/{spaceId}/ URL prefix resolves
    // to a real namespace at request time.
    await soRepo.create(
      'space',
      { name: SPACE_ID, disabledFeatures: [] },
      { id: SPACE_ID, overwrite: true }
    );

    // The migrated timeline lives under a fresh savedObjectId in the
    // awesome-space namespace.
    await soRepo.create(
      timelineSavedObjectType,
      { title: 'An awesome timeline' },
      {
        id: NEW_TIMELINE_ID,
        initialNamespaces: [SPACE_ID],
        overwrite: true,
      }
    );

    // Notes in the post-7.16 + post-8.0 state: `timelineId` lives only as a SO
    // reference, `eventId` is preserved as an attribute.
    const timelineReference = {
      id: NEW_TIMELINE_ID,
      name: TIMELINE_ID_REF_NAME,
      type: timelineSavedObjectType,
    };

    await soRepo.create(
      noteSavedObjectType,
      { eventId: MIGRATED_EVENT_ID, note: 'a comment on a pinned event' },
      {
        id: NOTE_ID_1,
        initialNamespaces: [SPACE_ID],
        references: [timelineReference],
        overwrite: true,
      }
    );

    await soRepo.create(
      noteSavedObjectType,
      { eventId: MIGRATED_EVENT_ID, note: 'A regular comment' },
      {
        id: NOTE_ID_2,
        initialNamespaces: [SPACE_ID],
        references: [timelineReference],
        overwrite: true,
      }
    );

    await soRepo.create(
      pinnedEventSavedObjectType,
      { eventId: MIGRATED_EVENT_ID },
      {
        id: PINNED_EVENT_ID,
        initialNamespaces: [SPACE_ID],
        references: [timelineReference],
        overwrite: true,
      }
    );

    // legacy-url-alias replicating what the 8.0.0 namespace conversion would
    // have created when moving the pre-8.0 space-prefixed timeline document
    // out of `.kibana_1` and into the awesome-space-scoped index.
    await soRepo.create(
      'legacy-url-alias',
      {
        sourceId: OLD_TIMELINE_ID,
        targetNamespace: SPACE_ID,
        targetType: timelineSavedObjectType,
        targetId: NEW_TIMELINE_ID,
        purpose: 'savedObjectConversion',
      },
      {
        id: LEGACY_ALIAS_ID,
        overwrite: true,
      }
    );
  });

  afterAll(async () => {
    await kibanaServer?.stop();
    await esServer?.stop();
  });

  it('returns aliasMatch outcome with alias_target_id', async () => {
    const response = await getSupertest(kibanaServer.root, 'get', resolveUrl)
      .query({ id: OLD_TIMELINE_ID })
      .expect(200);

    const body = response.body as ResolvedTimeline;
    expect(body.outcome).toBe('aliasMatch');
    expect(body.alias_target_id).toBe(NEW_TIMELINE_ID);
    expect(body.timeline.title).toBe('An awesome timeline');
  });

  it('returns notes with correct eventId and timelineId rewritten to resolved savedObjectId', async () => {
    const response = await getSupertest(kibanaServer.root, 'get', resolveUrl)
      .query({ id: OLD_TIMELINE_ID })
      .expect(200);

    const body = response.body as ResolvedTimeline;
    const resolvedId = body.timeline.savedObjectId;

    expect(resolvedId).toBe(NEW_TIMELINE_ID);
    expect(body.timeline.notes?.some((n) => n.eventId === MIGRATED_EVENT_ID)).toBe(true);
    expect(body.timeline.notes?.every((n) => n.timelineId === resolvedId)).toBe(true);
  });

  it('returns pinned events with correct eventId and timelineId rewritten to resolved savedObjectId', async () => {
    const response = await getSupertest(kibanaServer.root, 'get', resolveUrl)
      .query({ id: OLD_TIMELINE_ID })
      .expect(200);

    const body = response.body as ResolvedTimeline;
    const resolvedId = body.timeline.savedObjectId;

    expect(resolvedId).toBe(NEW_TIMELINE_ID);
    expect(body.timeline.pinnedEventsSaveObject?.some((p) => p.eventId === MIGRATED_EVENT_ID)).toBe(
      true
    );
    expect(body.timeline.pinnedEventsSaveObject?.every((p) => p.timelineId === resolvedId)).toBe(
      true
    );
  });
});
