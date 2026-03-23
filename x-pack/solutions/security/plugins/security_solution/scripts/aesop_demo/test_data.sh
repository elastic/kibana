#!/bin/bash
# AESOP Demo Data Test Script

ES_URL="http://localhost:9200"

echo "🧪 Testing AESOP Demo Data"
echo "=========================="
echo ""

# Test 1: Count all data types
echo "📊 Data Counts:"
echo "---------------"
curl -s "$ES_URL/.internal.alerts-*/_count" | node -e "process.stdin.on('data', d => console.log('Security Alerts:', JSON.parse(d).count))"
curl -s "$ES_URL/.aesop-persona-behaviors/_count" | node -e "process.stdin.on('data', d => console.log('Persona Behaviors:', JSON.parse(d).count))"
curl -s "$ES_URL/.ds-traces-apm*/_count" | node -e "process.stdin.on('data', d => console.log('APM Traces:', JSON.parse(d).count))"
curl -s "$ES_URL/.ds-logs-generic*/_count" | node -e "process.stdin.on('data', d => console.log('Logs:', JSON.parse(d).count))"
curl -s "$ES_URL/.ds-metrics-*/_count" | node -e "process.stdin.on('data', d => console.log('Metrics:', JSON.parse(d).count))"
echo ""

# Test 2: Sample persona behaviors
echo "👤 Sample Persona Query Patterns:"
echo "----------------------------------"
curl -s "$ES_URL/.aesop-persona-behaviors/_search" -H 'Content-Type: application/json' -d '{
  "size": 0,
  "aggs": {
    "personas": {
      "terms": { "field": "persona_name.keyword" }
    },
    "query_types": {
      "terms": { "field": "query_type.keyword" }
    }
  }
}' | node -e "
  process.stdin.on('data', d => {
    const aggs = JSON.parse(d).aggregations;
    console.log('Personas:');
    aggs.personas.buckets.forEach(b => console.log('  -', b.key, '(' + b.doc_count + ' queries)'));
    console.log('\\nQuery Types:');
    aggs.query_types.buckets.forEach(b => console.log('  -', b.key, '(' + b.doc_count + ' queries)'));
  })
"
echo ""

# Test 3: MITRE ATT&CK coverage
echo "🎯 MITRE ATT&CK Tactic Coverage:"
echo "--------------------------------"
curl -s "$ES_URL/.internal.alerts-*/_search?size=0" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "filter": {
        "range": {
          "@timestamp": { "gte": "now-7d" }
        }
      }
    }
  },
  "aggs": {
    "tactics": {
      "terms": {
        "field": "kibana.alert.rule.threat.tactic.name.keyword",
        "size": 20
      }
    }
  }
}' | node -e "
  process.stdin.on('data', d => {
    const tactics = JSON.parse(d).aggregations?.tactics?.buckets || [];
    if (tactics.length > 0) {
      tactics.forEach(t => console.log('  -', t.key, '(' + t.doc_count + ' alerts)'));
    } else {
      console.log('  (Data may need MITRE mapping - check raw alerts)');
    }
  })
"
echo ""

echo "✅ Test Complete!"
echo ""
echo "💡 Next steps:"
echo "  - Open Kibana: http://localhost:5601"
echo "  - Explore Security Alerts: http://localhost:5601/app/security/alerts"
echo "  - View APM traces: http://localhost:5601/app/apm"
