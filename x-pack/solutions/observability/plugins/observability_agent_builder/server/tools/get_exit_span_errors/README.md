# get_exit_span_errors

Retrieves failed exit spans for a service, showing which downstream dependencies are returning errors.

## Use Cases

- **Downstream failure detection**: Identify which external calls are failing when a service has high error rates
- **Dependency health**: See which downstream services are returning errors
- **Root cause analysis**: Pinpoint the failing dependency causing cascading failures

## Examples

### Get failed downstream calls for checkout service

```json
{
  "serviceName": "checkout",
  "start": "now-1h",
  "end": "now"
}
```

### Filter by environment

```json
{
  "serviceName": "checkout",
  "serviceEnvironment": "production",
  "start": "now-1h",
  "end": "now"
}
```

## Output

Returns exit span errors grouped by destination and span name:

```json
{
  "exitSpanErrors": [
    {
      "span.destination.service.resource": "oteldemo.PaymentService",
      "span.name": "oteldemo.PaymentService/Charge",
      "count": 150
    },
    {
      "span.destination.service.resource": "oteldemo.PaymentService",
      "span.name": "oteldemo.PaymentService/Refund",
      "count": 10
    }
  ]
}
```

