#!/usr/bin/env python3
"""
Backing stream docs + Knowledge Indicator entity features for seed_nightshift.sh.

Invoked by seed_nightshift.sh; not meant to be run standalone unless for debugging.
"""
from __future__ import annotations

import base64
import datetime as dt
import json
import os
import random
import sys
import urllib.error
import urllib.parse
import urllib.request

ES_URL = os.environ["ES_URL"]
ES_AUTH = os.environ["ES_AUTH"]
KIBANA_URL = os.environ["KIBANA_URL"]

AUTH_HEADER = "Basic " + base64.b64encode(ES_AUTH.encode()).decode()

# Appended to seeded summaries/descriptions so Nightshift flyouts exceed the 300 code-point
# TruncatableSummary threshold and show "Show more" during local demos.
NIGHTSHIFT_TRUNCATION_DEMO_SUFFIX = (
    " Additional Nightshift demo context: treat this incident as active until error budgets "
    "recover for two consecutive hours. Compare deploy markers, canary traffic share, regional "
    "load, checkout funnel conversion, support ticket volume, and synthetic login checks before "
    "declaring mitigation complete or closing the incident in Nightshift."
)


def code_point_length(text: str) -> int:
    return len(list(text))


def lengthen_for_truncation_demo(text: str, min_code_points: int = 301) -> str:
    combined = text
    while code_point_length(combined) < min_code_points:
        combined = f"{combined}{NIGHTSHIFT_TRUNCATION_DEMO_SUFFIX}"
    return combined


def lengthen_significant_events_ndjson(ndjson: str) -> str:
    lines = [line for line in ndjson.strip().split("\n") if line.strip()]
    output: list[str] = []
    for line in lines:
        obj = json.loads(line)
        if set(obj.keys()) == {"create"}:
            output.append(line)
            continue
        if isinstance(obj.get("summary"), str):
            obj["summary"] = lengthen_for_truncation_demo(obj["summary"])
        for signal in obj.get("signals", []):
            if isinstance(signal, dict) and isinstance(signal.get("description"), str):
                signal["description"] = lengthen_for_truncation_demo(signal["description"])
        output.append(json.dumps(obj, separators=(",", ":")))
    return "\n".join(output) + "\n"


def prepare_ki_feature_for_seed(feature: dict) -> dict:
    prepared = dict(feature)
    description = prepared.get("description")
    if isinstance(description, str):
        prepared["description"] = lengthen_for_truncation_demo(description)
    return prepared

# (index, detection anchor in minutes ago, change point shape)
STREAMS = [
    ("logs.web-frontend", 120, "spike"),
    ("logs.api-gateway", 120, "step_change"),
    ("metrics.payment-service", 180, "trend_change"),
    ("logs.payment-service", 180, "spike"),
    ("metrics.elasticsearch-cluster", 360, "step_change"),
    ("logs.elasticsearch", 360, "spike"),
    ("logs.dns-resolver", 1440, "dip"),
    ("logs.ingress-controller", 1440, "stationary"),
    ("metrics.kafka-cluster", 120, "trend_change"),
    ("logs.order-processing", 120, "dip"),
    ("metrics.cache-service", 120, "dip"),
]

BUCKET_MINUTES = 5
WINDOW_BEFORE_MIN = 190
WINDOW_AFTER_MIN = 25

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
    "metrics.payment-service": [
        {
            "id": "payment-service",
            "stream_name": "metrics.payment-service",
            "type": "entity",
            "subtype": "service",
            "title": "payment-service",
            "description": (
                "Payment processing service with transaction batching enabled. "
                "Heap grows linearly between OOM kills as uncommitted references accumulate."
            ),
            "properties": {"service.name": "payment-service"},
            "confidence": 86,
            "evidence": [
                "service.name = payment-service",
                "jvm.memory.heap.used grows linearly between restarts",
            ],
            "tags": ["payments", "jvm"],
            "meta": {"related_apm_service": "payment-service"},
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
                "Payment service pod logs showing repeated OOMKilled events "
                "followed by Kubernetes restarts every ~45 minutes."
            ),
            "properties": {"service.name": "payment-service"},
            "confidence": 84,
            "evidence": [
                "kubernetes.pod.name LIKE payment-service-*",
                "message LIKE *OOMKilled*",
            ],
            "tags": ["payments", "kubernetes"],
            "meta": {"related_apm_service": "payment-service"},
        }
    ],
    "metrics.elasticsearch-cluster": [
        {
            "id": "elasticsearch-data",
            "stream_name": "metrics.elasticsearch-cluster",
            "type": "entity",
            "subtype": "infrastructure",
            "title": "Elasticsearch data nodes",
            "description": (
                "Elasticsearch data tier holding long-lived indices after an ILM migration. "
                "Three of five nodes crossed the 85% disk high watermark."
            ),
            "properties": {"elasticsearch.node.role": "data"},
            "confidence": 93,
            "evidence": [
                "disk_used_pct > 85 on es-data-1, es-data-2, es-data-4",
                "write throttling engaged",
            ],
            "tags": ["elasticsearch", "storage"],
        }
    ],
    "logs.elasticsearch": [
        {
            "id": "elasticsearch-cluster",
            "stream_name": "logs.elasticsearch",
            "type": "entity",
            "subtype": "infrastructure",
            "title": "Elasticsearch cluster",
            "description": (
                "Cluster logs showing bulk write rejections once disk watermarks "
                "engaged, back-pressuring upstream ingestion."
            ),
            "properties": {"service.name": "elasticsearch"},
            "confidence": 90,
            "evidence": [
                "message LIKE *es_rejected_execution_exception*",
                "bulk write rejections ~240/min",
            ],
            "tags": ["elasticsearch", "ingestion"],
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
    "metrics.kafka-cluster": [
        {
            "id": "order-processors",
            "stream_name": "metrics.kafka-cluster",
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
    "metrics.cache-service": [
        {
            "id": "cache-service",
            "stream_name": "metrics.cache-service",
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


def enrich_doc(index: str, ts: dt.datetime, minutes_to_anchor: float, seq: int) -> dict:
    """Shape docs so ES|QL evidence queries in signals return meaningful fields."""
    base = {"@timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ")}

    if index == "logs.web-frontend":
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
        status = 200 if minutes_to_anchor > 30 else (500 if seq % 3 == 0 else 502)
        base.update(
            {
                "service.name": "api-gateway",
                "http.response.status_code": status,
                "message": f"auth middleware upstream response {status}",
            }
        )
    elif index == "metrics.payment-service":
        heap = 536_870_912 + int(max(0, (180 - minutes_to_anchor) * 8_000_000))
        base.update(
            {
                "service.name": "payment-service",
                "jvm.memory.heap.used": min(heap, 2_147_483_648),
            }
        )
    elif index == "logs.payment-service":
        pod = f"payment-service-{['7d9f', 'b2c1'][seq % 2]}"
        base.update(
            {
                "service.name": "payment-service",
                "kubernetes.pod.name": pod,
                "message": "pod killed: OOMKilled (exit code 137)" if seq % 4 == 0 else "processing batch",
            }
        )
    elif index == "metrics.elasticsearch-cluster":
        total = 1_000_000_000_000
        available = int(total * (0.18 if minutes_to_anchor > 30 else 0.12))
        base.update(
            {
                "elasticsearch.node.name": f"es-data-{1 + seq % 5}",
                "elasticsearch.node.stats.fs.total.total_in_bytes": total,
                "elasticsearch.node.stats.fs.total.available_in_bytes": available,
            }
        )
    elif index == "logs.elasticsearch":
        base.update(
            {
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
    elif index == "metrics.kafka-cluster":
        lag = 12_480 + int(max(0, (120 - minutes_to_anchor) * 180_000))
        base.update(
            {
                "kafka.consumergroup.id": "order-processors",
                "kafka.partition.id": seq % 8,
                "kafka.consumergroup.lag": lag,
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
    elif index == "metrics.cache-service":
        hit_rate = 0.62 if minutes_to_anchor <= 10 else 0.94
        base.update(
            {
                "service.name": "cache-service",
                "cache.hit_rate": hit_rate,
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


def main() -> None:
    seed_backing_streams()
    print("")
    print("Seeding KI entity features via Kibana ...")
    seed_ki_features()


if __name__ == "__main__":
    try:
        main()
    except urllib.error.URLError as err:
        print(f"ERROR: request failed — is Elasticsearch/Kibana running? {err}", file=sys.stderr)
        sys.exit(1)
