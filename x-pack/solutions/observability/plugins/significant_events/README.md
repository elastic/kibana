# Significant Events Plugin

This plugin provides an interface to manage significant events.

The data model (source-id keys, space scope, unchanged route paths) is documented in [`AGENTS.md`](./AGENTS.md#data-model). The UI lives in the [`nightshift`](../nightshift/README.md) plugin.

## Setting up a space

The Nightshift detection engine runs as a service account, never as the user who clicked: rules, the
bound workflows (extraction, discovery, sync, cleanup) and the write-backs all use it. A space has to
be set up once, explicitly. Until it is, knowledge indicator extraction, discovery, rule creation and
pausing, resuming or resetting Significant Events are refused with a `503`
(`Nightshift is not set up in this space`). There is no UI for it yet: it is an internal API.

### Prerequisites

- Service accounts are on: `xpack.security.serviceAccounts.enabled` (on by default on stateful).
- The caller holds the `manage_security` cluster privilege.
- Stateful: the `nightshift_detection_engine` role exists. Create it first, with the privileges of
  `DETECTION_ENGINE_SERVICE_ACCOUNT_ROLE` in [`common/service_account.ts`](./common/service_account.ts).
- Serverless: the role is defined by the platform. Pending the elasticsearch-controller role change.

### Set a space up

Internal routes need the headers `kbn-xsrf: true` and `x-elastic-internal-origin: kibana`. For a
space other than the default one, prefix the path with `/s/<space id>`.

```
POST /internal/significant_events/service_account/_enable
{}
```

This binds the detection engine to the account (creating a `nightshift_detection_engine` account if
the space has none), installs the space's bound workflows, switches on those the space's settings and
state call for, and enables the rules again as the account. It is safe to call again: it makes the
space match its settings, and repairs one that was set up only in part.

The account is shared by every space. It can only be created once, so for a second space, whose
`_enable` finds none bound, pass the existing account. Its id is `serviceAccountIds.detectionEngine` in the
`_disable` response, and is also listed by `GET /internal/security/service_account`:

```
POST /internal/significant_events/service_account/_enable
{ "serviceAccountIds": { "detectionEngine": "<account id>" } }
```

### Take a space's setup away

```
POST /internal/significant_events/service_account/_disable
```

This pauses the space, switches its bound workflows off, waits for their runs to stop and unbinds the
detection engine. The workflows stay installed, with their run history, and `_enable` switches them
back on. If the pause could not stop everything (the error names what failed), the setup is kept: call
`_disable` again to retry.

### Upgrading

Spaces set up by an earlier version have none of the above. After upgrading, call `_enable` once in
each space; until then everything listed at the top is refused.
