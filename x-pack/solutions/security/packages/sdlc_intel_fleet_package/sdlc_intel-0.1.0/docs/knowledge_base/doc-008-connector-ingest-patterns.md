# DOC-008 · Connector ingest patterns (CONN-003/004)

## Metadata-only guarantee (Google Drive)

`google_drive.listFilesIngest` and `google_drive.getFileMetadata` return **metadata only** —
name, owner, timestamps, permissions. File content is never ingested into Elasticsearch.
A defensive `stripFileContent` pass removes any content-bearing field (`content`, `data`,
`body`, `binaryContent`, `base64Content`) from responses before they leave the connector.

## Download on demand via agent (the intended pattern)

When a workflow or analyst genuinely needs file content:

1. The ingest workflow stores only metadata + `webViewLink`.
2. An agent (Agent Builder / Hermes) calls the **agent-facing** `google_drive.download_file`
   tool (`isTool: true`) at read time, scoped to the specific file.
3. The content lives only in the agent conversation/step context — never in ES.

This keeps the ES corpus privacy-preserving while still allowing on-demand access.

## SOQL cursor pagination (Salesforce)

`salesforce.soqlIngest` paginates via `nextRecordsUrl`:

```yaml
- name: fetch_cases
  type: salesforce.soqlIngest
  with:
    soql: "SELECT Id, CaseNumber FROM Case"
    nextRecordsUrl: '${{ variables.nextRecordsUrl }}'
```

The compact result carries `records`, `nextRecordsUrl`, `hasMore`, `done`, `totalSize`.
Auth (401) and scope/access (403) failures surface actionable messages that tell the
operator whether to re-authorize the connector or fix connected-app scopes.
