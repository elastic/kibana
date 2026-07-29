#!/usr/bin/env python3
"""
Backing stream docs, Knowledge Indicators, and rule occurrences for seed_nightshift.sh.

Invoked by seed_nightshift.sh; not meant to be run standalone unless for debugging.
"""
from __future__ import annotations

import base64
import datetime as dt
import json
import os
import random
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ES_URL = os.environ["ES_URL"]
ES_AUTH = os.environ["ES_AUTH"]
KIBANA_URL = os.environ["KIBANA_URL"]
DETECTIONS_BODY = os.environ.get("DETECTIONS_BODY", "")

AUTH_HEADER = "Basic " + base64.b64encode(ES_AUTH.encode()).decode()

# Appended when needed so Nightshift flyouts exceed the 300 code-point TruncatableSummary
# threshold and show "Show more". Entity names use backticks for inline code styling in UI.
NIGHTSHIFT_TRUNCATION_DEMO_SUFFIX = (
    " Continue watching `error-budget`, deploy markers, canary share, regional load, "
    "funnel conversion, support tickets, and synthetic checks for two stable hours "
    "before closing the incident."
)

EVENT_SUMMARY_INLINE_TAIL: dict[str, str] = {
    "evt-001": (
        " Metrics on `web-frontend` show P95 request latency climbing from ~120ms to ~890ms "
        "within ten minutes of `api-gateway` v2.8.1. Auth middleware 5xx share rose to ~3.1% "
        "and checkout flows through `order-processing` remain degraded."
    ),
    "evt-002": (
        " Heap on `payment-service` grows from ~512MB to ~2GB between OOM kills every ~45 minutes "
        "after batching shipped. Downstream `ledger-service` sees retry storms during restart windows."
    ),
    "evt-003": (
        " Disk on `elasticsearch-data` nodes crossed the 85% watermark on `es-data-1`, "
        "`es-data-2`, and `es-data-4`. Ingestion through `api-gateway` and `web-frontend` "
        "pipelines is back-pressured with bulk rejections near 240/min."
    ),
    "evt-004": (
        " SERVFAIL rate on `coredns` hit ~12% in `us-east-1 AZ-b` during maintenance. "
        "`api-gateway` and `order-processing` saw cascading resolution timeouts until capacity returned."
    ),
    "evt-005": (
        " Wildcard cert for `*.internal.acme.co` was within 48 hours of expiry on "
        "`ingress-controller` after `cert-manager` renewal failed. Internal TLS for "
        "`api-gateway` and `web-frontend` ingress was at risk."
    ),
    "evt-006": (
        " Lag for `order-processors` on partitions 0–7 reached ~2.4M messages after a "
        "`schema-registry` blip. Throughput on `order-processing` fell from ~15k/s to ~3k/s "
        "while `fulfillment-api` backlog grows."
    ),
    "evt-007": (
        " Hit rate on `cache-service` dipped for ~8 minutes during a planned node replacement. "
        "`web-frontend` session lookups stayed within SLO; no sustained impact on `catalog-service`."
    ),
    "evt-008": (
        " Empty-result rate on `search-api` climbed after the latest `catalog-service` deploy while "
        "`web-frontend` browse still routes through `api-gateway`. Related degradation also touches "
        "`order-processing` checkout lookups."
    ),
    "evt-009": (
        " 401 share on `api-gateway` auth routes doubled during an identity provider rotation. "
        "`web-frontend` login failures rose in parallel and `payment-service` token validation "
        "retries stacked behind `auth-database` timeouts."
    ),
}

INLINE_CODE_ENTITY_NAMES: tuple[str, ...] = (
    "api-gateway",
    "auth-database",
    "billing-api",
    "cache-service",
    "catalog-service",
    "coredns",
    "elasticsearch-data",
    "es-data-1",
    "es-data-2",
    "es-data-4",
    "fulfillment-api",
    "inventory-service",
    "ledger-service",
    "notification-service",
    "order-processing",
    "order-processors",
    "payment-gateway",
    "payment-service",
    "schema-registry",
    "search-api",
    "web-frontend",
)


def strip_markdown_formatting(text: str) -> str:
    """Remove legacy markdown enrichment so flyouts only render inline-code tokens."""
    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    cleaned = re.sub(r"(?m)^-\s+", "", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip()


def wrap_known_entities_in_backticks(text: str) -> str:
    wrapped = text
    for name in sorted(INLINE_CODE_ENTITY_NAMES, key=len, reverse=True):
        if f"`{name}`" in wrapped:
            continue
        wrapped = re.sub(
            rf"(?<![`/\w]){re.escape(name)}(?![`/\w])",
            f"`{name}`",
            wrapped,
        )
    return wrapped


def build_inline_code_summary(base_summary: str, event_id: str | None) -> str:
    tail = EVENT_SUMMARY_INLINE_TAIL.get(event_id or "", "")
    if not tail:
        return base_summary.strip()
    return f"{base_summary.strip()}{tail}"


def normalize_event_summary(base_summary: str, event_id: str | None) -> str:
    stripped = strip_markdown_formatting(base_summary)
    with_tokens = wrap_known_entities_in_backticks(stripped)
    return build_inline_code_summary(with_tokens, event_id)


def code_point_length(text: str) -> int:
    return len(list(text))


def lengthen_for_truncation_demo(text: str, min_code_points: int = 301) -> str:
    combined = text
    while code_point_length(combined) < min_code_points:
        combined = f"{combined}{NIGHTSHIFT_TRUNCATION_DEMO_SUFFIX}"
    return combined


# Downstream impact entries (distinct from causal_features). Keys match seeded event_id values.
# Entries intentionally overlap across events so landing blast-radius chips show counts > 1.
BLAST_RADIUS_BY_EVENT_ID: dict[str, list[dict]] = {
    "evt-001": [
        {
            "type": "entity",
            "feature_id": "order-processing",
            "name": "order-processing",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "entity",
            "feature_id": "catalog-service",
            "name": "catalog-service",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "dependency",
            "feature_id": "web-frontend-auth-db",
            "source": "web-frontend",
            "target": "auth-database",
            "protocol": "HTTP",
            "stream_name": "logs.api-gateway",
        },
        {
            "type": "entity",
            "feature_id": "notification-service",
            "name": "notification-service",
            "stream_name": "logs.api-gateway",
        },
        {
            "type": "entity",
            "feature_id": "search-api",
            "name": "search-api",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "entity",
            "feature_id": "payment-service",
            "name": "payment-service",
            "stream_name": "logs.payment-service",
        },
    ],
    "evt-002": [
        {
            "type": "dependency",
            "feature_id": "payment-to-ledger",
            "source": "payment-service",
            "target": "ledger-service",
            "protocol": "gRPC",
            "stream_name": "logs.payment-service",
        },
        {
            "type": "infrastructure",
            "feature_id": "payment-service-pods",
            "title": "payment-service pods",
            "workloads": ["payment-gateway", "payment-settlement-worker"],
            "stream_name": "logs.payment-service",
        },
        {
            "type": "entity",
            "feature_id": "billing-api",
            "name": "billing-api",
            "stream_name": "logs.payment-service",
        },
        {
            "type": "entity",
            "feature_id": "order-processing",
            "name": "order-processing",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "entity",
            "feature_id": "web-frontend",
            "name": "web-frontend",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "dependency",
            "feature_id": "payment-auth-db",
            "source": "payment-service",
            "target": "auth-database",
            "protocol": "HTTP",
            "stream_name": "logs.payment-service",
        },
    ],
    "evt-003": [
        {
            "type": "entity",
            "feature_id": "api-gateway",
            "name": "api-gateway",
            "stream_name": "logs.api-gateway",
        },
        {
            "type": "entity",
            "feature_id": "web-frontend",
            "name": "web-frontend",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "infrastructure",
            "feature_id": "es-data-tier",
            "title": "Elasticsearch data tier",
            "workloads": ["es-data-1", "es-data-2", "es-data-4"],
            "stream_name": "logs.elasticsearch",
        },
        {
            "type": "entity",
            "feature_id": "order-processing",
            "name": "order-processing",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "entity",
            "feature_id": "payment-service",
            "name": "payment-service",
            "stream_name": "logs.payment-service",
        },
        {
            "type": "entity",
            "feature_id": "catalog-service",
            "name": "catalog-service",
            "stream_name": "logs.web-frontend",
        },
    ],
    "evt-004": [
        {
            "type": "entity",
            "feature_id": "api-gateway",
            "name": "api-gateway",
            "stream_name": "logs.api-gateway",
        },
        {
            "type": "entity",
            "feature_id": "order-processing",
            "name": "order-processing",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "dependency",
            "feature_id": "api-gateway-coredns",
            "source": "api-gateway",
            "target": "coredns",
            "protocol": "UDP",
            "stream_name": "logs.dns-resolver",
        },
        {
            "type": "entity",
            "feature_id": "web-frontend",
            "name": "web-frontend",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "entity",
            "feature_id": "payment-service",
            "name": "payment-service",
            "stream_name": "logs.payment-service",
        },
    ],
    "evt-005": [
        {
            "type": "entity",
            "feature_id": "api-gateway",
            "name": "api-gateway",
            "stream_name": "logs.api-gateway",
        },
        {
            "type": "entity",
            "feature_id": "web-frontend",
            "name": "web-frontend",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "entity",
            "feature_id": "order-processing",
            "name": "order-processing",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "dependency",
            "feature_id": "ingress-api-gateway",
            "source": "ingress-controller",
            "target": "api-gateway",
            "protocol": "TLS",
            "stream_name": "logs.ingress-controller",
        },
    ],
    "evt-006": [
        {
            "type": "entity",
            "feature_id": "order-processing",
            "name": "order-processing",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "dependency",
            "feature_id": "order-processors-schema",
            "source": "order-processors",
            "target": "schema-registry",
            "protocol": "HTTP",
            "stream_name": "logs.kafka-cluster",
        },
        {
            "type": "entity",
            "feature_id": "fulfillment-api",
            "name": "fulfillment-api",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "entity",
            "feature_id": "inventory-service",
            "name": "inventory-service",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "entity",
            "feature_id": "web-frontend",
            "name": "web-frontend",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "entity",
            "feature_id": "api-gateway",
            "name": "api-gateway",
            "stream_name": "logs.api-gateway",
        },
    ],
    "evt-007": [
        {
            "type": "entity",
            "feature_id": "web-frontend",
            "name": "web-frontend",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "entity",
            "feature_id": "catalog-service",
            "name": "catalog-service",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "entity",
            "feature_id": "search-api",
            "name": "search-api",
            "stream_name": "logs.web-frontend",
        },
    ],
    "evt-008": [
        {
            "type": "entity",
            "feature_id": "catalog-service",
            "name": "catalog-service",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "entity",
            "feature_id": "order-processing",
            "name": "order-processing",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "entity",
            "feature_id": "api-gateway",
            "name": "api-gateway",
            "stream_name": "logs.api-gateway",
        },
        {
            "type": "entity",
            "feature_id": "payment-service",
            "name": "payment-service",
            "stream_name": "logs.payment-service",
        },
        {
            "type": "dependency",
            "feature_id": "search-catalog",
            "source": "search-api",
            "target": "catalog-service",
            "protocol": "HTTP",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "entity",
            "feature_id": "notification-service",
            "name": "notification-service",
            "stream_name": "logs.api-gateway",
        },
    ],
    "evt-009": [
        {
            "type": "entity",
            "feature_id": "web-frontend",
            "name": "web-frontend",
            "stream_name": "logs.web-frontend",
        },
        {
            "type": "entity",
            "feature_id": "payment-service",
            "name": "payment-service",
            "stream_name": "logs.payment-service",
        },
        {
            "type": "dependency",
            "feature_id": "gateway-auth-db",
            "source": "api-gateway",
            "target": "auth-database",
            "protocol": "HTTP",
            "stream_name": "logs.api-gateway",
        },
        {
            "type": "entity",
            "feature_id": "order-processing",
            "name": "order-processing",
            "stream_name": "logs.order-processing",
        },
        {
            "type": "entity",
            "feature_id": "billing-api",
            "name": "billing-api",
            "stream_name": "logs.payment-service",
        },
        {
            "type": "entity",
            "feature_id": "payment-gateway",
            "name": "payment-gateway",
            "stream_name": "logs.payment-service",
        },
        {
            "type": "entity",
            "feature_id": "ledger-service",
            "name": "ledger-service",
            "stream_name": "logs.payment-service",
        },
    ],
}


def apply_blast_radius_seed(obj: dict) -> None:
    event_id = obj.get("event_id")
    if not isinstance(event_id, str):
        return
    blast_radius = BLAST_RADIUS_BY_EVENT_ID.get(event_id)
    if blast_radius is not None:
        obj["blast_radius"] = blast_radius


def lengthen_significant_events_ndjson(ndjson: str) -> str:
    lines = [line for line in ndjson.strip().split("\n") if line.strip()]
    output: list[str] = []
    for line in lines:
        obj = json.loads(line)
        if set(obj.keys()) == {"create"}:
            output.append(line)
            continue
        apply_blast_radius_seed(obj)
        event_id = obj.get("event_id") if isinstance(obj.get("event_id"), str) else None
        if isinstance(obj.get("summary"), str):
            rich = normalize_event_summary(obj["summary"], event_id)
            obj["summary"] = lengthen_for_truncation_demo(rich)
        for signal in obj.get("signals", []):
            if isinstance(signal, dict) and isinstance(signal.get("description"), str):
                signal["description"] = lengthen_for_truncation_demo(signal["description"])
        output.append(json.dumps(obj, separators=(",", ":")))
    return "\n".join(output) + "\n"


def prepare_ki_feature_for_seed(feature: dict) -> dict:
    prepared = dict(feature)
    description = prepared.get("description")
    if isinstance(description, str):
        title = prepared.get("title") or prepared.get("id") or "Entity"
        rich = (
            f"{description.strip()}\n\n"
            f"Entity: {title}. Operational notes for Nightshift entity flyouts; "
            "evidence lines below map to seeded stream docs."
        )
        prepared["description"] = lengthen_for_truncation_demo(rich)
    return prepared

# Backing streams are logs.* only (Nightshift demo does not use metrics streams yet).
STREAMS = [
    ("logs.web-frontend", 120, "spike"),
    ("logs.api-gateway", 120, "step_change"),
    ("logs.payment-service", 180, "trend_change"),
    ("logs.elasticsearch", 360, "step_change"),
    ("logs.dns-resolver", 1440, "dip"),
    ("logs.ingress-controller", 1440, "stationary"),
    ("logs.kafka-cluster", 120, "trend_change"),
    ("logs.order-processing", 120, "dip"),
    ("logs.cache-service", 120, "dip"),
]

BUCKET_MINUTES = 5
WINDOW_BEFORE_MIN = 190
WINDOW_AFTER_MIN = 25


def parse_seed_detections() -> list[dict]:
    detections: list[dict] = []
    for line in DETECTIONS_BODY.splitlines():
        if not line:
            continue
        document = json.loads(line)
        if "detection_id" in document:
            detections.append(document)
    return detections


KI_FEATURES_BY_STREAM: dict[str, list[dict]] = {
    "logs.web-frontend": [
        {
            "id": "web-frontend",
            "stream_name": "logs.web-frontend",
            "type": "entity",
            "subtype": "service",
            "title": "web-frontend",
            "description": (
                "User-facing web application serving checkout, browse, and search flows. "
                "P95 request latency spiked after the api-gateway v2.8.1 rollout."
            ),
            "properties": {"service.name": "web-frontend", "deployment.version": "v2.8.1"},
            "confidence": 88,
            "evidence": [
                "service.name = web-frontend",
                "deployment.version = v2.8.1",
                "transaction.type = request",
            ],
            "tags": ["frontend", "user-facing"],
            "meta": {"related_apm_service": "web-frontend"},
        }
    ],
    "logs.api-gateway": [
        {
            "id": "api-gateway",
            "stream_name": "logs.api-gateway",
            "type": "entity",
            "subtype": "service",
            "title": "api-gateway",
            "description": (
                "Edge API gateway routing authenticated traffic to backend services. "
                "Auth middleware on v2.8.1 performs synchronous DB lookups under load."
            ),
            "properties": {"service.name": "api-gateway", "deployment.version": "v2.8.1"},
            "confidence": 91,
            "evidence": [
                "service.name = api-gateway",
                "http.response.status_code >= 500 on auth path",
            ],
            "tags": ["gateway", "auth"],
            "meta": {"related_apm_service": "api-gateway"},
        }
    ],
    "logs.payment-service": [
        {
            "id": "payment-service",
            "stream_name": "logs.payment-service",
            "type": "entity",
            "subtype": "service",
            "title": "payment-service",
            "description": (
                "Payment processing service with transaction batching enabled. "
                "Heap grows linearly between OOM kills; pod logs show repeated OOMKilled events."
            ),
            "properties": {"service.name": "payment-service"},
            "confidence": 86,
            "evidence": [
                "service.name = payment-service",
                "jvm.memory.heap.used grows linearly between restarts",
                "message LIKE *OOMKilled*",
            ],
            "tags": ["payments", "jvm", "kubernetes"],
            "meta": {"related_apm_service": "payment-service"},
        }
    ],
    "logs.elasticsearch": [
        {
            "id": "elasticsearch-data",
            "stream_name": "logs.elasticsearch",
            "type": "entity",
            "subtype": "infrastructure",
            "title": "Elasticsearch data nodes",
            "description": (
                "Elasticsearch cluster logs including disk watermark and bulk rejection events. "
                "Three of five data nodes crossed the 85% disk high watermark."
            ),
            "properties": {
                "name": "elasticsearch-data",
                "service.name": "elasticsearch",
                "elasticsearch.node.role": "data",
            },
            "confidence": 93,
            "evidence": [
                "disk_used_pct > 85 on es-data-1, es-data-2, es-data-4",
                "message LIKE *es_rejected_execution_exception*",
            ],
            "tags": ["elasticsearch", "storage", "ingestion"],
        }
    ],
    "logs.dns-resolver": [
        {
            "id": "coredns",
            "stream_name": "logs.dns-resolver",
            "type": "entity",
            "subtype": "service",
            "title": "CoreDNS",
            "description": (
                "Internal DNS resolver scaled below peak demand during maintenance, "
                "causing SERVFAIL spikes in us-east-1 AZ-b."
            ),
            "properties": {"service.name": "coredns", "cloud.availability_zone": "us-east-1b"},
            "confidence": 79,
            "evidence": [
                "dns.response_code = SERVFAIL",
                "failure rate ~12% in us-east-1 AZ-b",
            ],
            "tags": ["dns", "network"],
        }
    ],
    "logs.ingress-controller": [
        {
            "id": "ingress-controller",
            "stream_name": "logs.ingress-controller",
            "type": "entity",
            "subtype": "service",
            "title": "Ingress controller",
            "description": (
                "Internal ingress terminating TLS for *.internal.acme.co. "
                "Automated cert-manager renewal failed after RBAC tightening."
            ),
            "properties": {"service.name": "ingress-controller"},
            "confidence": 82,
            "evidence": [
                "message LIKE *certificate*expir*",
                "wildcard cert within 48h of expiry",
            ],
            "tags": ["ingress", "tls"],
        }
    ],
    "logs.kafka-cluster": [
        {
            "id": "order-processors",
            "stream_name": "logs.kafka-cluster",
            "type": "entity",
            "subtype": "consumer_group",
            "title": "order-processors",
            "description": (
                "Kafka consumer group processing order events. Lag on partitions 0-7 "
                "grew monotonically after a schema registry outage."
            ),
            "properties": {"kafka.consumergroup.id": "order-processors"},
            "confidence": 87,
            "evidence": [
                "kafka.consumergroup.id = order-processors",
                "kafka.consumergroup.lag > 2.4M on partitions 0-7",
            ],
            "tags": ["kafka", "orders"],
        }
    ],
    "logs.order-processing": [
        {
            "id": "order-processing",
            "stream_name": "logs.order-processing",
            "type": "entity",
            "subtype": "service",
            "title": "order-processing",
            "description": (
                "Order handling workers that deserialise Kafka messages. "
                "Throughput dropped from ~15k/s to ~3k/s during retry loops."
            ),
            "properties": {"service.name": "order-processing"},
            "confidence": 85,
            "evidence": [
                "event.action = message_processed",
                "throughput fell from 15k/s to 3k/s",
            ],
            "tags": ["orders", "kafka-consumer"],
            "meta": {"related_apm_service": "order-processing"},
        }
    ],
    "logs.cache-service": [
        {
            "id": "cache-service",
            "stream_name": "logs.cache-service",
            "type": "entity",
            "subtype": "service",
            "title": "cache-service",
            "description": (
                "Redis cache cluster serving session and catalog lookups. "
                "Brief hit-rate dip during a planned node replacement — benign."
            ),
            "properties": {"service.name": "cache-service"},
            "confidence": 45,
            "evidence": [
                "service.name = cache-service",
                "cache.hit_rate dip recovered within 8 minutes",
            ],
            "tags": ["cache", "redis"],
        }
    ],
}


def es_request(
    method: str,
    path: str,
    body: str | dict | None = None,
    *,
    content_type: str = "application/x-ndjson",
) -> dict | None:
    payload: bytes | None = None
    if isinstance(body, str):
        payload = body.encode()
    elif isinstance(body, dict):
        payload = json.dumps(body).encode()
        content_type = "application/json"

    req = urllib.request.Request(
        f"{ES_URL}{path}",
        data=payload,
        method=method,
        headers={
            "Authorization": AUTH_HEADER,
            "Content-Type": content_type,
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        raise


def delete_backing_stream(name: str) -> None:
    es_request("DELETE", f"/_data_stream/{name}")
    es_request("DELETE", f"/{name}")
    es_request("DELETE", f"/_index_template/nightshift-{name.replace('.', '-')}")


def ensure_backing_data_stream(name: str) -> None:
    """Kibana Streams requires backing indices to be ES data streams, not plain indices."""
    delete_backing_stream(name)
    template = {
        "index_patterns": [name],
        "data_stream": {},
        "priority": 200,
        "template": {
            "settings": {"number_of_shards": 1, "number_of_replicas": 0},
            "mappings": {
                "dynamic": True,
                "properties": {"@timestamp": {"type": "date"}},
            },
        },
    }
    es_request(
        "PUT",
        f"/_index_template/nightshift-{name.replace('.', '-')}",
        template,
    )


def kibana_request(method: str, path: str, body: dict | None = None) -> tuple[int, object]:
    payload = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{KIBANA_URL}{path}",
        data=payload,
        method=method,
        headers={
            "Authorization": AUTH_HEADER,
            "Content-Type": "application/json",
            "kbn-xsrf": "true",
            "x-elastic-internal-origin": "Kibana",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            content_type = resp.headers.get("content-type", "")
            if "application/json" in content_type:
                return resp.status, json.loads(resp.read())
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as err:
        content_type = err.headers.get("content-type", "")
        if "application/json" in content_type:
            return err.code, json.loads(err.read())
        return err.code, err.read().decode()


def docs_per_bucket(shape: str, minutes_to_anchor: float, rng: random.Random) -> int:
    baseline = 5 + rng.randint(-1, 2)
    if shape == "spike":
        return 18 + rng.randint(-3, 4) if minutes_to_anchor <= 15 else baseline
    if shape == "dip":
        return max(1, 2 - rng.randint(0, 1)) if minutes_to_anchor <= 15 else baseline
    if shape == "step_change":
        return 14 + rng.randint(-2, 3) if minutes_to_anchor <= 30 else baseline
    if shape == "trend_change":
        if minutes_to_anchor <= 60:
            ramp = (60 - minutes_to_anchor) / 60
            return baseline + int(ramp * 11) + rng.randint(-1, 1)
        return baseline
    return baseline


def occurrence_count(shape: str, minutes_from_anchor: float, rng: random.Random) -> int:
    baseline = 2 + rng.randint(0, 2)
    if shape == "spike":
        return 12 + rng.randint(-2, 3) if -15 <= minutes_from_anchor <= 0 else baseline
    if shape == "dip":
        return rng.randint(0, 1) if -15 <= minutes_from_anchor <= 0 else baseline + 3
    if shape == "step_change":
        return 10 + rng.randint(-1, 2) if minutes_from_anchor >= -15 else baseline
    if shape == "trend_change":
        progress = min(max((minutes_from_anchor + 60) / 60, 0), 1)
        return baseline + round(progress * 10)
    return 5 + rng.randint(-1, 1)


def enrich_doc(index: str, ts: dt.datetime, minutes_to_anchor: float, seq: int) -> dict:
    """Shape docs so ES|QL evidence queries in signals return meaningful fields."""
    base = {"@timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ")}

    if index == "logs.web-frontend":
        # evt-008 (empty search ~1h ago): anchor at 120m → minutes_to_anchor ≈ 60.
        if 50 <= minutes_to_anchor <= 70 and seq % 3 == 0:
            base.update(
                {
                    "service.name": "web-frontend",
                    "message": "empty search results for catalog SKU facet query",
                }
            )
        else:
            latency_us = 480_000 if minutes_to_anchor > 15 else 890_000 + seq * 10_000
            base.update(
                {
                    "service.name": "web-frontend",
                    "transaction.type": "request",
                    "transaction.duration.us": latency_us,
                    "message": f"GET /checkout responded in {latency_us // 1000}ms",
                }
            )
    elif index == "logs.api-gateway":
        # evt-001 5xx and evt-009 401 both spike near the 120m anchor (minutes_to_anchor ≤ 30).
        if minutes_to_anchor <= 30:
            if seq % 4 == 1:
                status = 401
            elif seq % 3 == 0:
                status = 500
            else:
                status = 502
        else:
            status = 200
        base.update(
            {
                "service.name": "api-gateway",
                "http.response.status_code": status,
                "message": f"auth middleware upstream response {status}",
            }
        )
    elif index == "logs.payment-service":
        pod = f"payment-service-{['7d9f', 'b2c1'][seq % 2]}"
        heap = 536_870_912 + int(max(0, (180 - minutes_to_anchor) * 8_000_000))
        base.update(
            {
                "service.name": "payment-service",
                "kubernetes.pod.name": pod,
                "jvm.memory.heap.used": min(heap, 2_147_483_648),
                "message": "pod killed: OOMKilled (exit code 137)" if seq % 4 == 0 else "processing batch",
            }
        )
    elif index == "logs.elasticsearch":
        total = 1_000_000_000_000
        available = int(total * (0.18 if minutes_to_anchor > 30 else 0.12))
        base.update(
            {
                "service.name": "elasticsearch",
                "elasticsearch.node.name": f"es-data-{1 + seq % 5}",
                "elasticsearch.node.stats.fs.total.total_in_bytes": total,
                "elasticsearch.node.stats.fs.total.available_in_bytes": available,
                "message": "es_rejected_execution_exception: rejected execution of bulk write"
                if minutes_to_anchor <= 30
                else "cluster state update completed",
            }
        )
    elif index == "logs.dns-resolver":
        base.update(
            {
                "dns.response_code": "SERVFAIL" if minutes_to_anchor <= 20 else "NOERROR",
                "message": "SERVFAIL resolving payments.internal.svc",
            }
        )
    elif index == "logs.ingress-controller":
        base.update(
            {
                "message": "certificate *.internal.acme.co expires in 48 hours — renewal failed",
            }
        )
    elif index == "logs.kafka-cluster":
        lag = 12_480 + int(max(0, (120 - minutes_to_anchor) * 180_000))
        base.update(
            {
                "service.name": "kafka-cluster",
                "kafka.consumergroup.id": "order-processors",
                "kafka.partition.id": seq % 8,
                "kafka.consumergroup.lag": lag,
                "message": f"consumer lag {lag} on partition {seq % 8}",
            }
        )
    elif index == "logs.order-processing":
        base.update(
            {
                "service.name": "order-processing",
                "event.action": "message_processed",
                "message": "order processed",
            }
        )
    elif index == "logs.cache-service":
        hit_rate = 0.62 if minutes_to_anchor <= 10 else 0.94
        base.update(
            {
                "service.name": "cache-service",
                "cache.hit_rate": hit_rate,
                "message": f"cache hit_rate={hit_rate}",
            }
        )
    else:
        base["message"] = f"sampled activity on {index}"

    return base


def seed_backing_streams() -> None:
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    total = 0

    for index, anchor_min_ago, shape in STREAMS:
        ensure_backing_data_stream(index)
        anchor = now - dt.timedelta(minutes=anchor_min_ago)
        lines: list[str] = []
        rng = random.Random(index)
        start = anchor - dt.timedelta(minutes=WINDOW_BEFORE_MIN)
        end = anchor + dt.timedelta(minutes=WINDOW_AFTER_MIN)
        bucket = start
        seq = 0

        while bucket < end:
            minutes_to_anchor = (anchor - bucket).total_seconds() / 60
            count = docs_per_bucket(shape, minutes_to_anchor, rng)
            for i in range(count):
                ts = bucket + dt.timedelta(seconds=i * (BUCKET_MINUTES * 60 // max(count, 1)))
                doc = enrich_doc(index, ts, minutes_to_anchor, seq)
                lines.append(json.dumps({"create": {}}))
                lines.append(json.dumps(doc))
                seq += 1
            bucket += dt.timedelta(minutes=BUCKET_MINUTES)

        body = "\n".join(lines) + "\n"
        result = es_request("POST", f"/{index}/_bulk?refresh=true", body)
        if result is None or result.get("errors"):
            raise SystemExit(
                f"ERROR: bulk index into {index} failed: {json.dumps(result)[:500]}"
            )
        doc_count = len(lines) // 2
        total += doc_count
        print(f"  {index}: {doc_count} docs ({shape})")

    print(f"Successfully indexed {total} backing stream docs.")


def seed_ki_features() -> None:
    feature_count = 0
    failures: list[str] = []

    for stream_name, features in KI_FEATURES_BY_STREAM.items():
        operations = [
            {
                "index": {
                    "feature": prepare_ki_feature_for_seed(feature),
                }
            }
            for feature in features
        ]
        status, data = kibana_request(
            "POST",
            f"/internal/streams/{urllib.parse.quote(stream_name, safe='')}/features/_bulk",
            {"operations": operations},
        )
        if status >= 300:
            failures.append(f"{stream_name} (HTTP {status})")
            continue
        feature_count += len(features)
        print(f"  {stream_name}: {len(features)} entity feature(s)")

    if failures:
        print("")
        print(
            "WARNING: KI entity features were not seeded — the Streams internal API "
            "returned errors for:",
            file=sys.stderr,
        )
        for item in failures:
            print(f"  - {item}", file=sys.stderr)
        print(
            "\nCommon fixes:\n"
            f"  - Set KIBANA_URL to include your base path (detected: {KIBANA_URL})\n"
            "  - Ensure Kibana is running from this repo with Streams + Significant Events\n"
            "  - Re-run with --clean so backing streams are recreated as data streams\n"
            "\nEntity pills still render via detection signals, but Summary/Evidence "
            "in the entity flyout will be thinner without KI features.",
            file=sys.stderr,
        )
        return

    print(f"Successfully upserted {feature_count} KI entity features via Kibana.")


def bulk_create(index: str, documents: list[dict]) -> int:
    lines: list[str] = []
    for document in documents:
        lines.append(json.dumps({"create": {}}))
        lines.append(json.dumps(document))

    result = es_request(
        "POST", f"/{index}/_bulk?refresh=true", "\n".join(lines) + "\n"
    )
    if result is None or result.get("errors"):
        raise SystemExit(
            f"ERROR: bulk index into {index} failed: {json.dumps(result)[:500]}"
        )
    return len(documents)


def seed_detection_occurrences() -> None:
    detections = parse_seed_detections()
    if not detections:
        raise SystemExit("ERROR: no Nightshift detections were provided for occurrence seeding")
    rule_uuids = [detection["rule_uuid"] for detection in detections]

    es_request(
        "POST",
        "/.significant_events-knowledge_indicators/_delete_by_query"
        "?refresh=true&conflicts=proceed",
        {"query": {"terms": {"query.rule_id": rule_uuids}}},
    )
    es_request(
        "POST",
        "/.rule-events/_delete_by_query?refresh=true&conflicts=proceed",
        {"query": {"prefix": {"group_hash": "nightshift-seed-"}}},
    )

    now = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")
    query_documents: list[dict] = []
    occurrence_documents: list[dict] = []

    for detection in detections:
        detection_id = detection["detection_id"]
        rule_uuid = detection["rule_uuid"]
        rule_name = detection["rule_name"]
        stream_name = detection["stream_name"]
        change_point_type = detection["change_point_type"]
        anchor = dt.datetime.fromisoformat(
            detection["@timestamp"].replace("Z", "+00:00")
        )

        query_documents.append(
            {
                "@timestamp": now,
                "id": f"nightshift-occurrences-{detection_id}",
                "type": "query",
                "title": rule_name,
                "description": "Nightshift seeded detection occurrence query",
                "stream.name": stream_name,
                "query": {
                    "esql": f"FROM {stream_name} | KEEP @timestamp",
                    "query_type": "match",
                    "severity_score": 80,
                    "rule_backed": True,
                    "rule_id": rule_uuid,
                },
            }
        )

        rng = random.Random(rule_uuid)
        bucket = anchor - dt.timedelta(minutes=60)
        end = anchor + dt.timedelta(minutes=15)
        while bucket < end:
            minutes_from_anchor = (bucket - anchor).total_seconds() / 60
            count = occurrence_count(change_point_type, minutes_from_anchor, rng)
            bucket_ms = int(bucket.timestamp() * 1000)
            write_time = bucket.isoformat().replace("+00:00", "Z")
            occurrence_documents.append(
                {
                    "@timestamp": write_time,
                    "scheduled_timestamp": write_time,
                    "type": "signal",
                    "space_id": "default",
                    "status": "breached",
                    "source": "internal",
                    "rule": {"id": rule_uuid, "version": 1},
                    "group_hash": f"nightshift-seed-{rule_uuid}-{bucket_ms}",
                    "data": {
                        "bucket": bucket_ms,
                        "metric_value": count,
                    },
                }
            )
            bucket += dt.timedelta(minutes=BUCKET_MINUTES)

    query_count = bulk_create(
        ".significant_events-knowledge_indicators", query_documents
    )
    occurrence_count_value = bulk_create(".rule-events", occurrence_documents)
    print(
        f"Successfully indexed {query_count} detection query links and "
        f"{occurrence_count_value} rule-event occurrences."
    )


def main() -> None:
    seed_backing_streams()
    print("")
    print("Seeding KI entity features via Kibana ...")
    seed_ki_features()
    print("")
    print("Seeding real detection occurrence series ...")
    seed_detection_occurrences()


if __name__ == "__main__":
    try:
        main()
    except urllib.error.URLError as err:
        print(f"ERROR: request failed — is Elasticsearch/Kibana running? {err}", file=sys.stderr)
        sys.exit(1)
