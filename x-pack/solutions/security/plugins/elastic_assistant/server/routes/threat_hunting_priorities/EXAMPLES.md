# Threat Hunting Priorities API Examples

## Workflow: Generate, Track Progress, and Retrieve Results

### Step 1: Generate Priorities

Start a new threat hunting priorities generation:

```bash
curl -X POST "http://localhost:5601/api/threat_hunting_priorities/_generate" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme" \
  -d '{
    "apiConfig": {
      "actionTypeId": ".gen-ai",
      "connectorId": "gpt5Azure",
      "model": "gpt-4"
    },
    "start": "now-30d",
    "end": "now"
  }'
```

**Response:**
```json
{
  "priorities": [
    {
      "title": "Suspicious Lateral Movement Detected",
      "description": "...",
      "entities": [...],
      "tags": [...],
      "priority": 9
    }
  ]
}
```

**Note:** Save the `execution_uuid` from the response (or extract it from the events) to track this specific generation.

### Step 2: Track Progress via Events API

Poll the events endpoint to check generation status:

```bash
# Get all events for tracking (replace EXECUTION_UUID with the actual UUID)
curl -X GET "http://localhost:5601/api/threat_hunting_priorities/events?executionUuid=EXECUTION_UUID&sortField=@timestamp&sortOrder=asc" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"
```

**Response:**
```json
{
  "data": [
    {
      "_id": "event-1",
      "_source": {
        "@timestamp": "2024-01-01T10:00:00Z",
        "execution_uuid": "123e4567-e89b-12d3-a456-426614174000",
        "event_type": "started",
        "namespace": "default",
        "api_config": {...},
        "user": {...}
      }
    },
    {
      "_id": "event-2",
      "_source": {
        "@timestamp": "2024-01-01T10:05:00Z",
        "execution_uuid": "123e4567-e89b-12d3-a456-426614174000",
        "event_type": "finished",
        "prioritiesCount": 5,
        "durationMs": 300000
      }
    }
  ],
  "total": 2,
  "skip": 0,
  "limit": 20
}
```

**Check for specific event types:**

```bash
# Check if generation has started
curl -X GET "http://localhost:5601/api/threat_hunting_priorities/events?executionUuid=EXECUTION_UUID&eventType=started" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"

# Check if generation has finished
curl -X GET "http://localhost:5601/api/threat_hunting_priorities/events?executionUuid=EXECUTION_UUID&eventType=finished" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"

# Check for errors
curl -X GET "http://localhost:5601/api/threat_hunting_priorities/events?executionUuid=EXECUTION_UUID&eventType=error" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"
```

### Step 3: Retrieve Generated Priorities

Once the generation is finished, retrieve the priorities:

```bash
# Get all priorities for a specific execution
curl -X GET "http://localhost:5601/api/threat_hunting_priorities?executionUuid=EXECUTION_UUID&sortField=priority&sortOrder=desc" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"
```

**Response:**
```json
{
  "data": [
    {
      "_id": "123e4567-e89b-12d3-a456-426614174000-suspicious-lateral-movement-detected",
      "_source": {
        "@timestamp": "2024-01-01T10:05:00Z",
        "execution_uuid": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Suspicious Lateral Movement Detected",
        "description": "Multiple hosts showing signs of lateral movement...",
        "entities": [
          {
            "type": "host",
            "idField": "host.name",
            "idValue": "workstation-01"
          }
        ],
        "tags": ["Lateral Movement", "T1021"],
        "priority": 9,
        "enriched_data": {...}
      }
    }
  ],
  "total": 5,
  "skip": 0,
  "limit": 20
}
```

**Get priorities with pagination:**

```bash
# Get first page (20 priorities)
curl -X GET "http://localhost:5601/api/threat_hunting_priorities?skip=0&limit=20&sortField=priority&sortOrder=desc" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"

# Get next page
curl -X GET "http://localhost:5601/api/threat_hunting_priorities?skip=20&limit=20&sortField=priority&sortOrder=desc" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"
```

## Complete Workflow Script

Here's a bash script that demonstrates the complete workflow:

```bash
#!/bin/bash

KIBANA_URL="http://localhost:5601"
CONNECTOR_ID="your-connector-id"
USERNAME="elastic"
PASSWORD="changeme"

# Step 1: Generate priorities
echo "Step 1: Generating threat hunting priorities..."
GENERATE_RESPONSE=$(curl -s -X POST "${KIBANA_URL}/api/threat_hunting_priorities/_generate" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "${USERNAME}:${PASSWORD}" \
  -d "{
    \"apiConfig\": {
      \"connectorId\": \"${CONNECTOR_ID}\",
      \"actionTypeId\": \".gen-ai\",
      \"model\": \"gpt-4\"
    },
    \"start\": \"now-30d\",
    \"end\": \"now\"
  }")

# Extract execution UUID from response (if available) or get from events
echo "Generation started. Checking events for execution UUID..."

# Step 2: Get the latest execution UUID from events
LATEST_EVENT=$(curl -s -X GET "${KIBANA_URL}/api/threat_hunting_priorities/events?limit=1&sortField=@timestamp&sortOrder=desc" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "${USERNAME}:${PASSWORD}")

EXECUTION_UUID=$(echo $LATEST_EVENT | jq -r '.data[0]._source.execution_uuid')

if [ -z "$EXECUTION_UUID" ] || [ "$EXECUTION_UUID" = "null" ]; then
  echo "Error: Could not get execution UUID"
  exit 1
fi

echo "Tracking execution: ${EXECUTION_UUID}"

# Step 3: Poll for completion
echo "Step 2: Polling for completion..."
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  FINISHED_EVENT=$(curl -s -X GET "${KIBANA_URL}/api/threat_hunting_priorities/events?executionUuid=${EXECUTION_UUID}&eventType=finished" \
    -H "kbn-xsrf: true" \
    -H "elastic-api-version: 2023-10-31" \
    -u "${USERNAME}:${PASSWORD}")

  if [ "$(echo $FINISHED_EVENT | jq '.data | length')" -gt 0 ]; then
    echo "Generation completed!"
    DURATION=$(echo $FINISHED_EVENT | jq -r '.data[0]._source.durationMs')
    PRIORITIES_COUNT=$(echo $FINISHED_EVENT | jq -r '.data[0]._source.prioritiesCount')
    echo "Duration: ${DURATION}ms, Priorities: ${PRIORITIES_COUNT}"
    break
  fi

  ERROR_EVENT=$(curl -s -X GET "${KIBANA_URL}/api/threat_hunting_priorities/events?executionUuid=${EXECUTION_UUID}&eventType=error" \
    -H "kbn-xsrf: true" \
    -H "elastic-api-version: 2023-10-31" \
    -u "${USERNAME}:${PASSWORD}")

  if [ "$(echo $ERROR_EVENT | jq '.data | length')" -gt 0 ]; then
    ERROR_MSG=$(echo $ERROR_EVENT | jq -r '.data[0]._source.error')
    echo "Generation failed: ${ERROR_MSG}"
    exit 1
  fi

  ATTEMPT=$((ATTEMPT + 1))
  echo "Waiting... (attempt ${ATTEMPT}/${MAX_ATTEMPTS})"
  sleep 5
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "Timeout: Generation did not complete within expected time"
  exit 1
fi

# Step 4: Retrieve results
echo "Step 3: Retrieving priorities..."
curl -X GET "${KIBANA_URL}/api/threat_hunting_priorities?executionUuid=${EXECUTION_UUID}&sortField=priority&sortOrder=desc" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "${USERNAME}:${PASSWORD}" | jq '.'
```

## Additional Useful Queries

### Get all recent events (across all executions)
```bash
curl -X GET "http://localhost:5601/api/threat_hunting_priorities/events?limit=50&sortField=@timestamp&sortOrder=desc" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"
```

### Get all priorities sorted by priority score
```bash
curl -X GET "http://localhost:5601/api/threat_hunting_priorities?sortField=priority&sortOrder=desc&limit=100" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"
```

### Get priorities in a date range
```bash
curl -X GET "http://localhost:5601/api/threat_hunting_priorities?start=2024-01-01&end=2024-01-31" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u "elastic:changeme"
```

### Get only high-priority items (priority >= 8)
Note: This requires a more complex query. For now, filter client-side or use Elasticsearch directly.

