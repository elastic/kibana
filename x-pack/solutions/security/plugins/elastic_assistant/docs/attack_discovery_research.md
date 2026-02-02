# Attack Discovery Research

This document provides a technical deep-dive into how Attack Discovery works, focusing on context window management, alert selection, and error handling.

## Overview

Attack Discovery uses a LangGraph-based workflow to analyze security alerts and identify potential attack patterns. The system retrieves alerts from Elasticsearch, transforms them into anonymized text, and sends them to an LLM for analysis.

## Context Window Management

### No Explicit Token Counting

**The system does not perform any token or context window counting.** Input size is controlled entirely by:

1. **Alert count (`size` parameter)**: User-configurable, with bounds defined in `kbn-elastic-assistant-common`:
   - Minimum: 10 alerts
   - Maximum: 10,000 alerts
   - See: [`impl/alerts/helpers/types.ts:10-11`](../../../../../platform/packages/shared/kbn-elastic-assistant-common/impl/alerts/helpers/types.ts)

2. **Field filtering**: Only fields from `anonymizationFields` are included per alert, reducing per-alert size but not total size.

### All Retrieved Alerts Are Sent

The combined prompt concatenates all anonymized alerts into a single string:

```typescript
${anonymizedAlerts.join('\n\n')}
```

See: [`prompts/get_combined_attack_discovery_prompt/index.ts:22`](../server/lib/attack_discovery/graphs/default_attack_discovery_graph/prompts/get_combined_attack_discovery_prompt/index.ts)

There is **no truncation, sampling, or chunking** of the alert list. If 10,000 alerts are retrieved, all 10,000 are included in the prompt.

### Output Length Limits

The default prompt instructs the LLM to limit output sizes (see [`server/lib/prompt/prompts.ts`](../server/lib/prompt/prompts.ts)):
- Details markdown: 2750 characters
- Summary: 200 characters

This is a prompt-based instruction, not enforced by code.

### Graph Limits

The graph has retry limits but no token limits (see [`graphs/default_attack_discovery_graph/constants.ts:13-15`](../server/lib/attack_discovery/graphs/default_attack_discovery_graph/constants.ts)):

| Constant | Default Value | Purpose |
|----------|---------------|---------|
| `DEFAULT_MAX_GENERATION_ATTEMPTS` | 10 | Max LLM invocations before giving up |
| `DEFAULT_MAX_HALLUCINATION_FAILURES` | 5 | Max hallucination detections before giving up |
| `DEFAULT_MAX_REPEATED_GENERATIONS` | 3 | Max identical responses before restarting |

## Error Handling

### Generic Error Handling Only

The generate and refine nodes use try/catch blocks that treat **all errors identically**, including context-length-exceeded errors:

**Generate node** ([`nodes/generate/index.ts:155-166`](../server/lib/langchain/output_chunking/nodes/generate/index.ts)):
```typescript
} catch (error) {
  const parsingError = `generate node is unable to parse (${llm._llmType()}) response from attempt ${generationAttempts}; (this may be an incomplete response from the model): ${error}`;
  logger?.debug(() => parsingError);

  return {
    ...state,
    combinedGenerations: combinedResponse,
    errors: [...state.errors, parsingError],
    generationAttempts: generationAttempts + 1,
    generations: [...generations, partialResponse],
  };
}
```

**Refine node** ([`nodes/refine/index.ts:137-172`](../server/lib/langchain/output_chunking/nodes/refine/index.ts)):
```typescript
} catch (error) {
  const parsingError = `refine node is unable to parse (${llm._llmType()}) response from attempt ${generationAttempts}; (this may be an incomplete response from the model): ${error}`;
  // ... same pattern
}
```

### No Automatic Reduction

When errors occur (including context-too-long errors from the LLM):
1. The error is logged and added to the `errors` array
2. The generation attempt counter is incremented
3. The system retries with the **same input**
4. After `maxGenerationAttempts` (default 10) failures, the graph terminates with accumulated errors

**There is no logic to:**
- Detect context-length-specific errors
- Reduce the alert count
- Truncate input
- Sample fewer alerts

## Alert Selection and Retrieval

### Selection Criteria (Code-Defined)

The ES query in [`getOpenAndAcknowledgedAlertsQuery`](../../../../../platform/packages/shared/kbn-elastic-assistant-common/impl/alerts/get_open_and_acknowledged_alerts_query/index.ts) applies:

- **Workflow status**: Only `open` or `acknowledged` alerts (excludes `closed`)
- **Building blocks**: Excludes alerts where `kibana.alert.building_block_type` exists
- **Time range**: Bounded by `start` and `end` parameters
- **Optional filter**: Additional query filters can be passed

### Sorting (Not Random)

Alerts are sorted deterministically:

```typescript
sort: [
  { 'kibana.alert.risk_score': { order: 'desc' } },
  { '@timestamp': { order: 'desc' } }
]
```

Top N alerts by risk score (highest first), then by timestamp (most recent first). **No random sampling.**

### User Control

The user controls:
- **Count**: The `size` parameter (10-10,000)
- **Time range**: `start` and `end` parameters
- **Filters**: Optional additional filters

The user **cannot** configure:
- Per-rule or per-alert importance weighting
- Custom prioritization logic
- Alert sampling strategy

Implicit importance is determined by:
1. ES query sorting (risk score, then timestamp)
2. Prompt instructions to the LLM about severity weighting

### Single Retrieval

Alerts are fetched **once** at graph start. The retriever node:
1. Executes the ES query
2. Transforms results to anonymized CSV format
3. Stores in `anonymizedDocuments` state

See: [`nodes/retriever/helpers/get_anonymized_alerts/index.ts`](../server/lib/attack_discovery/graphs/default_attack_discovery_graph/nodes/retriever/helpers/get_anonymized_alerts/index.ts)

The graph **does not**:
- Fetch additional alerts during analysis
- Iterate to pull more context based on findings
- Make follow-up queries for related alerts

## Alert Transformation

### CSV Format

Each alert is transformed to a simple CSV-like text format:

```
field1,value1
field2,value2
...
```

This transformation happens via `transformRawData` → `getCsvFromData` in:
[`kbn-elastic-assistant-common/impl/data_anonymization/get_csv_from_data/index.ts`](../../../../../platform/packages/shared/kbn-elastic-assistant-common/impl/data_anonymization/get_csv_from_data/index.ts)

### Field Filtering

Only fields present in `anonymizationFields` (the allowed list) are included. This reduces per-alert size but does not limit the total number of alerts.

### Anonymization

Sensitive values can be replaced with anonymized tokens based on the anonymization configuration, with a replacement map maintained for de-anonymization of results.

## MITRE ATT&CK Integration

The generation schema constrains `mitreAttackTactics` to the 14 MITRE ATT&CK tactics:
- Reconnaissance
- Resource Development
- Initial Access
- Execution
- Persistence
- Privilege Escalation
- Defense Evasion
- Credential Access
- Discovery
- Lateral Movement
- Collection
- Command and Control
- Exfilteration
- Impact

Prompts explicitly instruct the LLM to reference MITRE ATT&CK tactics and techniques when describing attack patterns.

## Generate/Refine Workflow

### Generate Phase

1. Combines prompt + all anonymized alerts into single query
2. Invokes LLM
3. Checks for hallucinations (using `responseIsHallucinated`)
4. Checks for repeated generations
5. Parses JSON response
6. Either returns results or proceeds to refine

### Refine Phase

1. Takes unrefined results from generate
2. Applies refine prompt (merge/split attack chains, remove false positives)
3. Same hallucination and repetition checks
4. Returns refined insights

### Continue Mechanism

If the LLM returns truncated JSON output, the `continuePrompt` instructs it to continue from where it left off. This handles output truncation, not input truncation.

## Key File Reference

| Component | Path |
|-----------|------|
| Graph entry point | `server/lib/attack_discovery/graphs/default_attack_discovery_graph/index.ts` |
| Graph constants | `server/lib/attack_discovery/graphs/default_attack_discovery_graph/constants.ts` |
| Retriever node | `server/lib/attack_discovery/graphs/default_attack_discovery_graph/nodes/retriever/` |
| Generate node | `server/lib/langchain/output_chunking/nodes/generate/index.ts` |
| Refine node | `server/lib/langchain/output_chunking/nodes/refine/index.ts` |
| Combined prompt | `server/lib/attack_discovery/graphs/default_attack_discovery_graph/prompts/get_combined_attack_discovery_prompt/index.ts` |
| Default prompts | `server/lib/prompt/prompts.ts` |
| Alert query | `kbn-elastic-assistant-common/impl/alerts/get_open_and_acknowledged_alerts_query/index.ts` |
| Size bounds | `kbn-elastic-assistant-common/impl/alerts/helpers/types.ts` |
| CSV transformation | `kbn-elastic-assistant-common/impl/data_anonymization/get_csv_from_data/index.ts` |
| API route | `server/routes/attack_discovery/public/post/post_attack_discovery_generate.ts` |

## Implications

1. **Large alert counts risk context overflow**: With 10,000 alerts allowed, the system can easily exceed LLM context limits. No safeguards exist.

2. **Silent failures on context errors**: Context-too-long errors are logged but not specially handled; the system simply retries with the same oversized input.

3. **No adaptive sizing**: Users must manually tune the `size` parameter if they encounter failures; the system won't auto-adjust.

4. **Single-shot analysis**: The LLM sees all alerts once; it cannot request more context or drill down into specific alerts.
