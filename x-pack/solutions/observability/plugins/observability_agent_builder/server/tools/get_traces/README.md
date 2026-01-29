# get_traces

## Examples

### Direct trace lookup

```json
{
  "tool_id": "observability.get_traces",
  "tool_params": {
    "start": "now-15m",
    "end": "now",
    "traceId": "abc123"
  }
}
```

### Notes

- This tool currently supports only direct lookup via `traceId`.
- Anchor-based lookup via `kqlFilter` (find anchors, then expand by trace.id) is intentionally not implemented yet.
