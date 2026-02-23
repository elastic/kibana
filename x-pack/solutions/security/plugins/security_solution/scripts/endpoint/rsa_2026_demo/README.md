# RSA 2026 Demo Endpoint Provisioning

This script automates the setup of endpoints for the RSA 2026 AI Forensics Agent demo scenario. It provisions real endpoints (VMs) with browser history data, detection rules, and workflows to support the demo.

## Overview

The script provisions:
- **Configurable number of endpoints** with specific integration configurations
- **Browser history data** (Chrome and Firefox) with malicious domain entries
- **Detection rule** for monitoring malicious domains (REF7707)
- **VirusTotal workflow** for automated domain enrichment

## Quick Start

### Local Development (Default: 1+1 endpoints)

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_rsa_2026_demo.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --virustotalApiKey YOUR_VIRUSTOTAL_API_KEY
```

### Production/Demo (5+5 endpoints)

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_rsa_2026_demo.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --defend-osquery-count 5 \
  --osquery-only-count 5 \
  --virustotalApiKey YOUR_VIRUSTOTAL_API_KEY
```

### Custom Configuration

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_rsa_2026_demo.js \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200 \
  --defend-osquery-count 3 \
  --osquery-only-count 2 \
  --malicious-domain digert.ictnsc.com \
  --virustotalApiKey YOUR_VIRUSTOTAL_API_KEY
```

## CLI Options

### Endpoint Configuration
- `--defend-osquery-count` - Number of endpoints with Elastic Defend + Osquery (default: 1)
- `--osquery-only-count` - Number of endpoints with Osquery only (default: 1)
- `--malicious-domain` - Malicious domain for browser history (default: digert.ictnsc.com)

### Workflow and Rules
- `--virustotal-api-key` - VirusTotal API key (required if `--create-workflow` is true)
- `--create-detection-rule` - Create detection rule (default: true)
- `--create-workflow` - Create VirusTotal workflow (default: true)

### Authentication
- `--kibanaUrl` - Kibana URL (default: http://127.0.0.1:5601)
- `--elasticUrl` - Elasticsearch URL (default: http://127.0.0.1:9200)
- `--username` - Kibana username (default: elastic)
- `--password` - Kibana password (default: changeme)
- `--apiKey` - Kibana API key (alternative to username/password)

### Other Options
- `--version` - Agent version to use (default: stack version)
- `--spaceId` - Space ID for provisioning (default: active space)
- `--cleanup` - Clean up all provisioned resources after completion

## What Gets Created

### Agent Policies
- **Policy A**: Elastic Defend + Osquery integration
- **Policy B**: Osquery integration only

### Endpoints
- Endpoints are created as Ubuntu VMs (using Multipass or Vagrant)
- Each endpoint is enrolled with Fleet and assigned to the appropriate policy
- Browser history is injected **after** Osquery extension is installed

### Browser History
- **Chrome**: 1 entry on first Defend+Osquery endpoint
- **Firefox**: 1 entry on first Osquery-only endpoint
- Uses fixed timestamps for demo consistency
- Domain: `digert.ictnsc.com` (or custom domain)

### Detection Rule
- Monitors for REF7707 malicious domains:
  - `poster.checkponit.com`
  - `support.fortineat.com`
  - `update.hobiter.com`
  - `support.vmphere.com`
  - `cloud.autodiscovar.com`
  - `digert.ictnsc.com`
- References Elastic Security Labs report: https://www.elastic.co/security-labs/fragile-web-ref7707

### VirusTotal Workflow
- Workflow name: "RSA 2026 Demo - VirusTotal Domain Check"
- Accepts domain as input
- Calls VirusTotal connector to check domain reputation
- Stores results in ECS-compliant format: `logs-threatintel.virustotal-default`
- Results accessible via threat intelligence queries

## Demo Scenario

1. **Detection rule triggers** when traffic to malicious domain is detected
2. **VirusTotal workflow** can be manually triggered to enrich the alert
3. **AI Forensics Agent** investigates:
   - Queries Osquery browser history on alert source endpoint
   - Finds browser history entry showing user visited the domain
   - Reviews VirusTotal enrichment results
   - Performs cross-endpoint query to find other exposed endpoints
4. **Agent provides explanation**:
   - Root cause: Phishing email leading to malicious link click
   - Typosquatting indicator
   - APT/threat group association
   - Recommendations for remediation

## Cleanup

To remove all provisioned resources:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_rsa_2026_demo.js \
  --cleanup \
  --kibanaUrl http://127.0.0.1:5601 \
  --elasticUrl http://127.0.0.1:9200
```

**Note**: Agent policies, detection rules, and workflows are **not** automatically deleted during cleanup (they may be useful for the demo). Delete them manually if needed.

## Browser History Details

### Chrome History
- Database: `~/.config/google-chrome/Default/History`
- SQLite database with `urls` and `visits` tables
- Single entry per endpoint (one visit)

### Firefox History
- Database: `~/.mozilla/firefox/*.default/places.sqlite`
- SQLite database with `moz_places` and `moz_historyvisits` tables
- Single entry per endpoint (one visit)

### Timestamps
- Uses fixed timestamp: 2024-01-15 10:30:00 UTC (for demo consistency)
- Timestamps are in microseconds (Chrome) or milliseconds (Firefox)

## VirusTotal Workflow

The workflow stores results in ECS-compliant threat enrichment format:

```json
{
  "threat": {
    "enrichments": [{
      "indicator": {
        "type": "domain",
        "domain": "digert.ictnsc.com"
      },
      "feed": {
        "name": "VirusTotal"
      },
      "matched": {
        "field": "destination.domain",
        "atomic": "digert.ictnsc.com",
        "type": "indicator_match_rule"
      },
      "virustotal": {
        "analysis_id": "...",
        "status": "...",
        "stats": {...}
      }
    }]
  }
}
```

Results are stored in `logs-threatintel.virustotal-default` index and are queryable via threat intelligence APIs.

## Troubleshooting

### Endpoints not enrolling
- Ensure Fleet Server is running
- Check Fleet Server URL is accessible from VMs
- Verify agent policies are created correctly

### Browser history not queryable
- Ensure Osquery browser history extension is installed
- Verify browser history was created **after** Osquery extension installation
- Check browser profile permissions

### VirusTotal workflow fails
- Verify VirusTotal API key is valid
- Check connector is created successfully
- Ensure network access to VirusTotal API

## References

- Elastic Security Labs Report: https://www.elastic.co/security-labs/fragile-web-ref7707
- Issue: https://github.com/elastic/security-team/issues/14895

