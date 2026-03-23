# AESOP Demo Environment Setup

This directory contains scripts for setting up the AESOP demonstration environment with synthetic multi-persona data.

## ⚠️ Critical: Run Order

**The data generator MUST run AFTER Kibana has fully initialized!**

Running the generator before Kibana starts will cause this error:
```
resource_already_exists_exception: index already exists and is not the write index for the alias
```

The generator now automatically waits (up to 60s) for Kibana's alerting framework to initialize.

## Quick Start

```bash
# CORRECT ORDER (recommended):
# 1. Start Elasticsearch
yarn es snapshot --license trial &

# 2. Start Kibana and wait for full initialization
yarn start
# Look for: "[info][plugins.alerting] Alerting framework initialized"

# 3. In a new terminal, generate data
node x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo/run_data_generator.js

# Or automated setup (handles ordering):
./setup_environment.sh
```

## What Gets Created

### Data Generated

- **Security Alerts**: ~15,000 alerts (MITRE ATT&CK aligned, 14 tactics covered)
- **Persona Behaviors**: ~2,700 query patterns (3 personas × 30 days × 30 queries/day)
- **APM Traces**: ~100,000 spans (10 microservices)
- **Logs**: ~50,000 entries (application + security + infrastructure)
- **Metrics**: ~17,000 datapoints (CPU, memory, network)

### Indices Created

- `.internal.alerts-security.alerts-default-000001` - Security alerts
- `.aesop-persona-behaviors` - Simulated SOC analyst query patterns
- `.aesop-proposed-skills` - Agent-discovered skills (populated during exploration)
- `.aesop-discovered-relationships` - Validated index relationships
- `traces-apm.sampled-default` - APM distributed traces
- `logs-generic-default` - Application logs
- `metrics-system.cpu-default` - Infrastructure metrics

### Personas Simulated

**Alice (SOC L3 Analyst - Senior)**:
- 90 queries/day
- Focuses on: alert triage, threat investigation, MITRE mapping
- Skill level: Expert

**Bob (SRE - Senior)**:
- 103 queries/day
- Focuses on: performance monitoring, error tracing, service health
- Skill level: Expert

**Charlie (Developer - Junior)**:
- 23 queries/day
- Focuses on: debugging errors, log searches
- Skill level: Beginner

## Configuration

The setup script auto-creates `config/kibana.dev.yml` with:

```yaml
xpack.evals.enabled: true
xpack.workflows.enabled: true

uiSettings:
  overrides:
    agentBuilder:experimentalFeatures: true

telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.sample_rate: 1
telemetry.tracing.exporters:
  - http:
      url: "http://localhost:4318/v1/traces"
```

## Verification

After setup completes, verify:

```bash
# Check Elasticsearch
curl http://localhost:9200

# Check EDOT collector
curl http://localhost:4318/v1/traces

# Check Kibana
curl http://localhost:5601/api/status

# Count documents
curl -u elastic:changeme "http://localhost:9200/.alerts-*/_count"
curl -u elastic:changeme "http://localhost:9200/.aesop-persona-behaviors/_count"
```

## Troubleshooting

### "resource_already_exists_exception" Error

**Problem**: You ran the data generator before Kibana initialized the alerting framework.

**Symptoms**:
```
[ERROR][plugins.alerting] Error creating concrete write index - resource_already_exists_exception
[ERROR][plugins.alerting] Attempted to create index: .internal.alerts-security.alerts-default-000001
as the write index for alias: .alerts-security.alerts-default, but the index already exists
and is not the write index for the alias
```

**Solution**:
```bash
# 1. Delete the conflicting index
curl -X DELETE 'http://localhost:9200/.internal.alerts-security.alerts-default-000001'

# 2. Restart Kibana (it will recreate the index correctly)
# Stop Kibana (Ctrl+C), then:
yarn start

# 3. Wait for alerting framework to initialize
# Look for: "[info][plugins.alerting] Alerting framework initialized"

# 4. Re-run the data generator
node x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo/run_data_generator.js
```

**Prevention**: The data generator now waits for Kibana automatically. If you see "⏳ Waiting for Kibana alerting framework", it's working correctly.

### Elasticsearch won't start

```bash
# Check if already running
lsof -i:9200

# Kill existing instance
pkill -f elasticsearch

# Restart
yarn es snapshot --license trial
```

### EDOT collector fails

```bash
# Check logs
cat /tmp/edot_collector.log

# Restart
pkill -f edot
node scripts/edot_collector > /tmp/edot_collector.log 2>&1 &
```

### Data generator errors

```bash
# Check ES is accessible
curl http://localhost:9200

# Check episode data exists
ls -la x-pack/solutions/security/plugins/security_solution/scripts/data/episodes/attacks/

# Run with debug logging
DEBUG=* node x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo/data_generator.js
```

## Files

- `setup_environment.sh` - Automated setup script (starts all services, generates data)
- `data_generator.ts` - TypeScript source for data generation
- `README.md` - This file
