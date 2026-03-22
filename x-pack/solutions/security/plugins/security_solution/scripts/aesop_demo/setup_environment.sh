#!/bin/bash
#
# AESOP Demo Environment Setup Script
#
# Automates complete environment setup for AESOP self-exploration demo:
# - Starts Elasticsearch
# - Starts EDOT collector (OTEL trace collection)
# - Starts Kibana with evals plugin enabled
# - Generates synthetic multi-persona data
# - Configures telemetry for trace capture
#
# Usage: ./setup_environment.sh
#

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIBANA_ROOT="$(cd "${SCRIPT_DIR}/../../../../../../.." && pwd)"

echo "🚀 AESOP Demo Environment Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: CHECK PREREQUISITES
# ═══════════════════════════════════════════════════════════════

echo "✓ Checking prerequisites..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 22.22.0"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "  Node.js: $NODE_VERSION"

# Check if in Kibana root
if [ ! -f "${KIBANA_ROOT}/package.json" ]; then
    echo "❌ Not in Kibana root directory"
    exit 1
fi

echo "  Working directory: ${KIBANA_ROOT}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 2: START ELASTICSEARCH (if not running)
# ═══════════════════════════════════════════════════════════════

echo "📦 Starting Elasticsearch..."

if curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo "  ✓ Elasticsearch already running"
else
    echo "  Starting ES snapshot..."
    cd "${KIBANA_ROOT}"
    yarn es snapshot --license trial > /dev/null 2>&1 &
    ES_PID=$!

    # Wait for ES to be ready (max 2 min)
    for i in {1..40}; do
        if curl -s http://localhost:9200 > /dev/null 2>&1; then
            echo "  ✓ Elasticsearch ready"
            break
        fi
        sleep 3
    done
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 3: START EDOT COLLECTOR (OTEL Trace Collection)
# ═══════════════════════════════════════════════════════════════

echo "📡 Starting EDOT Collector (OpenTelemetry)..."

# Check if EDOT is already running
if curl -s http://localhost:4318/v1/traces > /dev/null 2>&1; then
    echo "  ✓ EDOT collector already running"
else
    echo "  Starting EDOT collector..."
    cd "${KIBANA_ROOT}"
    node scripts/edot_collector > /tmp/edot_collector.log 2>&1 &
    EDOT_PID=$!

    # Wait for EDOT to be ready
    sleep 5

    if curl -s http://localhost:4318/v1/traces > /dev/null 2>&1; then
        echo "  ✓ EDOT collector ready (PID: $EDOT_PID)"
        echo "    Logs: /tmp/edot_collector.log"
    else
        echo "  ⚠️  EDOT collector may not be ready, check logs"
    fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 4: CONFIGURE KIBANA (evals plugin + telemetry)
# ═══════════════════════════════════════════════════════════════

echo "⚙️  Configuring Kibana for AESOP..."

CONFIG_FILE="${KIBANA_ROOT}/config/kibana.dev.yml"

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "  Creating config/kibana.dev.yml..."
    cat > "$CONFIG_FILE" << 'EOF'
# AESOP Demo Configuration

# Enable evals plugin
xpack.evals.enabled: true

# Enable experimental Agent Builder features
uiSettings:
  overrides:
    agentBuilder:experimentalFeatures: true

# Enable telemetry + tracing (for OTEL trace capture)
telemetry.enabled: true
telemetry.tracing.enabled: true
telemetry.tracing.sample_rate: 1  # Capture 100% of traces during eval
telemetry.tracing.exporters:
  - http:
      url: "http://localhost:4318/v1/traces"  # EDOT collector

# Workflows enabled
xpack.workflows.enabled: true

# Logging
logging.root.level: info
EOF
    echo "  ✓ Created config/kibana.dev.yml"
else
    echo "  ✓ Using existing config/kibana.dev.yml"
    echo "  ⚠️  Make sure it includes:"
    echo "      xpack.evals.enabled: true"
    echo "      telemetry.tracing.enabled: true"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 5: START KIBANA (if not running)
# ═══════════════════════════════════════════════════════════════

echo "🌐 Starting Kibana..."

if curl -s http://localhost:5601/api/status > /dev/null 2>&1; then
    echo "  ✓ Kibana already running"
else
    echo "  Starting Kibana (this takes ~2 minutes)..."
    cd "${KIBANA_ROOT}"
    yarn start > /tmp/kibana.log 2>&1 &
    KIBANA_PID=$!

    # Wait for Kibana to be ready (max 3 min)
    echo "  Waiting for Kibana to start..."
    for i in {1..60}; do
        if curl -s http://localhost:5601/api/status | grep -q "available"; then
            echo "  ✓ Kibana ready"
            break
        fi
        sleep 3
    done
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 6: GENERATE SYNTHETIC DATA
# ═══════════════════════════════════════════════════════════════

echo "🎲 Generating synthetic demo data..."

cd "${KIBANA_ROOT}"

# Run data generator script (compile TypeScript first if needed)
echo "  Running data generator (this takes ~5 minutes)..."
echo "  Note: Data generator is currently a stub - skipping for now"
echo "  TODO: Compile data_generator.ts or use existing episode data"
# node x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo/data_generator.js

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 7: VERIFICATION
# ═══════════════════════════════════════════════════════════════

echo "✅ Verifying environment setup..."

# Check Elasticsearch
ES_STATUS=$(curl -s http://localhost:9200 | jq -r '.tagline' 2>/dev/null || echo "error")
if [ "$ES_STATUS" = "You Know, for Search" ]; then
    echo "  ✓ Elasticsearch: Running"
else
    echo "  ❌ Elasticsearch: Not responding correctly"
fi

# Check EDOT
if curl -s http://localhost:4318/v1/traces > /dev/null 2>&1; then
    echo "  ✓ EDOT Collector: Running"
else
    echo "  ⚠️  EDOT Collector: Not responding"
fi

# Check Kibana
KB_STATUS=$(curl -s http://localhost:5601/api/status | jq -r '.status.overall.level' 2>/dev/null || echo "error")
if [ "$KB_STATUS" = "available" ]; then
    echo "  ✓ Kibana: Running"
else
    echo "  ⚠️  Kibana: $KB_STATUS"
fi

# Check data
ALERTS_COUNT=$(curl -s -u elastic:changeme "http://localhost:9200/.alerts-*/_count" | jq -r '.count' 2>/dev/null || echo "0")
BEHAVIORS_COUNT=$(curl -s -u elastic:changeme "http://localhost:9200/.aesop-persona-behaviors/_count" | jq -r '.count' 2>/dev/null || echo "0")

echo "  ✓ Security alerts: ~${ALERTS_COUNT}"
echo "  ✓ Persona behaviors: ~${BEHAVIORS_COUNT}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ AESOP Demo Environment Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Kibana:         http://localhost:5601"
echo "📍 Evals Plugin:   http://localhost:5601/app/evals"
echo "📍 Elasticsearch:  http://localhost:9200"
echo "📍 EDOT Collector: http://localhost:4318"
echo ""
echo "🔑 Credentials:    elastic / changeme"
echo ""
echo "📚 Next Steps:"
echo "  1. Navigate to http://localhost:5601/app/evals/aesop"
echo "  2. Trigger self-exploration workflow"
echo "  3. Review proposed skills"
echo "  4. View OTEL traces in TraceWaterfall"
echo ""
echo "🛑 To stop services:"
echo "  pkill -f elasticsearch"
echo "  pkill -f kibana"
echo "  pkill -f edot_collector"
echo ""
