#!/usr/bin/env python3
"""Benchmark the Rule Tuning FP harvest: current single query vs enabled-first pipeline.

Runs against any Kibana + ES pair (Cloud or local), prints took / CPU / docs read
per step, and checks that both approaches pick the same rules. Also covers the
security-team#20315 cases: deleted rules (--deleted-check) and a disabled rule
(--disable-top / --disable <uuid>).

  python3 rule_tuning_harvest_bench.py --kibana https://<deployment>.kb.<region>.gcp.elastic-cloud.com \
      --user elastic --netrc ~/.netrc --deleted-check --disable-top

Password comes from ES_PASSWORD, or from a netrc file (machine <es host> login <user> password <pw>),
or is prompted. Full ES|QL responses go to --out <dir> as JSON if you want the alert ids.
"""
import argparse, base64, getpass, json, netrc, os, sys, time, urllib.error, urllib.parse, urllib.request

TAG = "detection-watch:tuning-reviewed"
INDEX = ".alerts-security.alerts-default"
TOP_IDS, SCREEN_LIMIT, HARVEST_LIMIT = 100, 200, 20


def build_queries(min_fp, min_rate):
    current = f"""FROM {INDEX} METADATA _id
| EVAL is_fp = `kibana.alert.workflow_status` == "closed" AND `kibana.alert.workflow_reason` == "false_positive"
| INLINE STATS reviewed_watermark = MAX(@timestamp) WHERE MV_CONTAINS(`kibana.alert.workflow_tags`, "{TAG}"), latest_revision = MAX(`kibana.alert.rule.revision`) BY `kibana.alert.rule.uuid`
| WHERE `kibana.alert.rule.revision` == latest_revision
| EVAL is_unreviewed_fp = is_fp AND (reviewed_watermark IS NULL OR @timestamp > reviewed_watermark)
| EVAL fp_recency_key = CONCAT(DATE_FORMAT("yyyyMMddHHmmssSSS", @timestamp), "|", _id)
| STATS total_count = COUNT(*), fp_rate_count = COUNT(*) WHERE is_fp, fp_count = COUNT(*) WHERE is_unreviewed_fp, last_fp_at = MAX(@timestamp) WHERE is_unreviewed_fp, recent_keys = TOP(fp_recency_key, {TOP_IDS}, "desc") WHERE is_unreviewed_fp BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision`
| WHERE fp_count >= {min_fp} AND fp_rate_count * 100 >= total_count * {min_rate}
| SORT fp_count DESC
| LIMIT {HARVEST_LIMIT}
| MV_EXPAND recent_keys
| EVAL alert_id = SUBSTRING(recent_keys, 19)
| STATS fp_count = MAX(fp_count), last_fp_at = MAX(last_fp_at), alert_ids = VALUES(alert_id), total_count = MAX(total_count), fp_rate_count = MAX(fp_rate_count) BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision`
| EVAL rule_revision_key = CONCAT(",", `kibana.alert.rule.uuid`, "@", TO_STRING(`kibana.alert.rule.revision`), ",")
| SORT fp_count DESC
| KEEP `kibana.alert.rule.uuid`, fp_count, last_fp_at, alert_ids, total_count, fp_rate_count, rule_revision_key"""

    screen = f"""FROM {INDEX}
| EVAL is_fp = `kibana.alert.workflow_status` == "closed" AND `kibana.alert.workflow_reason` == "false_positive"
| STATS total_count = COUNT(*), fp_rate_count = COUNT(*) WHERE is_fp, untagged_fp_count = COUNT(*) WHERE is_fp AND NOT MV_CONTAINS(`kibana.alert.workflow_tags`, "{TAG}"), last_fp_at = MAX(@timestamp) WHERE is_fp, reviewed_watermark = MAX(@timestamp) WHERE MV_CONTAINS(`kibana.alert.workflow_tags`, "{TAG}") BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision`
| WHERE (reviewed_watermark IS NULL OR last_fp_at > reviewed_watermark) AND untagged_fp_count >= {min_fp} AND fp_rate_count * 100 >= total_count * {min_rate}
| SORT untagged_fp_count DESC
| LIMIT {SCREEN_LIMIT}
| EVAL rule_revision_key = CONCAT(",", `kibana.alert.rule.uuid`, "@", TO_STRING(`kibana.alert.rule.revision`), ",")
| KEEP `kibana.alert.rule.uuid`, total_count, fp_rate_count, rule_revision_key"""

    harvest = f"""FROM {INDEX}
| INLINE STATS reviewed_watermark = MAX(@timestamp) WHERE MV_CONTAINS(`kibana.alert.workflow_tags`, "{TAG}"), latest_revision = MAX(`kibana.alert.rule.revision`) BY `kibana.alert.rule.uuid`
| WHERE `kibana.alert.rule.revision` == latest_revision AND (reviewed_watermark IS NULL OR @timestamp > reviewed_watermark)
| EVAL fp_recency_key = CONCAT(DATE_FORMAT("yyyyMMddHHmmssSSS", @timestamp), "|", `kibana.alert.uuid`)
| STATS fp_count = COUNT(*), last_fp_at = MAX(@timestamp), recent_keys = TOP(fp_recency_key, {TOP_IDS}, "desc") BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision`
| WHERE fp_count >= {min_fp}
| SORT fp_count DESC
| LIMIT {HARVEST_LIMIT}
| MV_EXPAND recent_keys
| EVAL alert_id = SUBSTRING(recent_keys, 19)
| STATS fp_count = MAX(fp_count), last_fp_at = MAX(last_fp_at), alert_ids = VALUES(alert_id) BY `kibana.alert.rule.uuid`, `kibana.alert.rule.revision`
| EVAL rule_revision_key = CONCAT(",", `kibana.alert.rule.uuid`, "@", TO_STRING(`kibana.alert.rule.revision`), ",")
| SORT fp_count DESC
| KEEP `kibana.alert.rule.uuid`, fp_count, last_fp_at, alert_ids, rule_revision_key"""
    return current, screen, harvest


FP_FILTER = [{"term": {"kibana.alert.workflow_status": "closed"}}, {"term": {"kibana.alert.workflow_reason": "false_positive"}}]


class Cluster:
    def __init__(self, args):
        self.kb = args.kibana.rstrip("/")
        self.es = (args.es or self.kb.replace(".kb.", ".es.")).rstrip("/")
        self.days = args.days
        self.space = f"/s/{args.space}" if args.space != "default" else ""
        self.out = args.out
        self.calls = 0
        password = os.environ.get("ES_PASSWORD") or self._netrc(args) or getpass.getpass(f"password for {args.user}: ")
        self.auth = "Basic " + base64.b64encode(f"{args.user}:{password}".encode()).decode()

    def _netrc(self, args):
        path = os.path.expanduser(args.netrc)
        if not os.path.exists(path):
            return None
        host = urllib.parse.urlparse(self.es).hostname
        found = netrc.netrc(path).authenticators(host)
        return found[2] if found and found[0] == args.user else None

    def _request(self, url, method="GET", body=None, headers=None, timeout=600):
        req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                     headers={"Authorization": self.auth, "Content-Type": "application/json", **(headers or {})})
        t0 = time.time()
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r), round(time.time() - t0, 2)

    def kibana(self, method, path, body=None):
        headers = {"kbn-xsrf": "true", "elastic-api-version": "2023-10-31"}
        return self._request(f"{self.kb}{self.space}{path}", method, body, headers, timeout=120)

    def esql(self, label, query, extra_filter=()):
        body = {
            "query": query,
            "profile": True,
            "filter": {"bool": {
                "filter": [{"range": {"@timestamp": {"gte": f"now-{self.days}d"}}}, *extra_filter],
                "must_not": [{"exists": {"field": "kibana.alert.group.index"}}],
            }},
        }
        try:
            d, wall = self._request(f"{self.es}/_query?allow_partial_results=false", "POST", body)
        except urllib.error.HTTPError as e:
            return {"error": e.read().decode()[:400]}
        self.calls += 1
        if self.out:
            os.makedirs(self.out, exist_ok=True)
            with open(os.path.join(self.out, f"{self.calls:02d}_{label.replace(' ', '_')}.json"), "w") as f:
                json.dump({k: v for k, v in d.items() if k != "profile"}, f)
        drivers = d.get("profile", {}).get("drivers", [])
        return {
            "took_s": d["took"] / 1000, "wall_s": wall,
            "docs": d.get("documents_found", 0), "values": d.get("values_loaded", 0),
            "cpu_s": sum(x.get("cpu_nanos", 0) for x in drivers) / 1e9,
            "rows": d["values"], "columns": [c["name"] for c in d["columns"]],
        }

    def enabled_rules(self):
        filt = urllib.parse.quote("alert.attributes.enabled: true and alert.attributes.consumer: siem")
        d, took = self.kibana("GET", f"/api/alerting/rules/_find?filter={filt}&per_page=10000&fields=revision")
        return d["data"], took


def show(label, r):
    if "error" in r:
        print(f"  {label:<10} ERROR {r['error']}")
        return
    print(f"  {label:<10} took={r['took_s']:6.1f}s  cpu={r['cpu_s']:6.1f}s  docs_read={r['docs']:>11,}  values_loaded={r['values']:>12,}  rows={len(r['rows'])}")


def rows_by_uuid(result):
    return {row[0]: row for row in result["rows"]}


def run_current(cluster, query):
    r = cluster.esql("current", query)
    show("current", r)
    return r


def run_pipeline(cluster, screen_q, harvest_q, label="pipeline"):
    rules, find_s = cluster.enabled_rules()
    ids = [r["id"] for r in rules]
    keys = "," + ",".join(f'{r["id"]}@{r["revision"]}' for r in rules) + ","
    print(f"  {'find':<10} took={find_s:6.1f}s  enabled rules={len(ids)}  response={len(json.dumps(rules)) // 1024} KB")
    s = cluster.esql(f"{label} screen", screen_q, [{"terms": {"kibana.alert.rule.uuid": ids}}])
    show("screen", s)
    if "error" in s:
        return None
    screened = [row for row in s["rows"] if row[3] in keys]
    print(f"  {'':<10} screened={len(s['rows'])}  current revision={len(screened)}")
    h = cluster.esql(f"{label} harvest", harvest_q, FP_FILTER + [{"terms": {"kibana.alert.rule.uuid": [row[0] for row in screened]}}])
    show("harvest", h)
    if "error" in h:
        return None
    total = find_s + s["took_s"] + h["took_s"]
    print(f"  {'total':<10} took={total:6.1f}s  cpu={s['cpu_s'] + h['cpu_s']:6.1f}s")
    totals = {row[3]: row for row in s["rows"]}
    for row in h["rows"]:
        t = totals[row[4]]
        print(f"     {row[0]}  fp={row[1]:>7}  total={t[1]:>7}  fp_rate_count={t[2]:>7}  ids={len(row[3]) if isinstance(row[3], list) else 1}")
    return {"rows": h["rows"], "totals": totals, "enabled": set(ids), "took_s": total}


def compare(current, pipeline):
    if not current or "error" in current or not pipeline:
        print("\nparity: skipped (a side failed)")
        return
    old, new = rows_by_uuid(current), rows_by_uuid({"rows": pipeline["rows"]})
    same = set(old) == set(new)
    print(f"\nparity: {'SAME' if same else 'DIFFERENT'} rule set ({len(old)} current vs {len(new)} pipeline)")
    print(f"  {'uuid':<36}  {'current fp':>10}  {'pipeline fp':>11}  {'current ids':>11}  {'pipeline ids':>12}")
    for uuid in sorted(set(old) | set(new), key=lambda u: -(old.get(u, new.get(u))[1])):
        o, n = old.get(uuid), new.get(uuid)
        ids = lambda row: (len(row[3]) if isinstance(row[3], list) else 1) if row else "-"
        print(f"  {uuid:<36}  {o[1] if o else '-':>10}  {n[1] if n else '-':>11}  {ids(o):>11}  {ids(n):>12}")
    if not same:
        print("  rules only in current:", [u for u in old if u not in new])
        print("  rules only in pipeline:", [u for u in new if u not in old])
        print("  (expected when current ranks rules that are disabled or deleted; see --deleted-check)")


def deleted_check(cluster, enabled):
    loose = build_queries(min_fp=1, min_rate=0)[1]
    a = cluster.esql("deleted-check unfiltered", loose)
    b = cluster.esql("deleted-check enabled", loose, [{"terms": {"kibana.alert.rule.uuid": list(enabled)}}])
    ghosts = [row[0] for row in a["rows"] if row[0] not in enabled]
    print(f"\ndeleted-rule check (gate relaxed to untagged_fp_count >= 1 past the watermark, LIMIT {SCREEN_LIMIT}):")
    print(f"  without enabled filter: {len(a['rows'])} rules, {len(ghosts)} of them have no enabled rule object")
    print(f"  with enabled filter:    {len(b['rows'])} rules, all enabled: {all(row[0] in enabled for row in b['rows'])}")


def disable_check(cluster, screen_q, harvest_q, uuid):
    cluster.kibana("PATCH", "/api/detection_engine/rules", {"id": uuid, "enabled": False})
    print(f"\ndisabled rule {uuid}, rerunning the pipeline:")
    try:
        r = run_pipeline(cluster, screen_q, harvest_q, "disabled")
        picked = r and any(row[0] == uuid for row in r["rows"])
        print(f"  disabled rule {'STILL PICKED' if picked else 'excluded'}")
    finally:
        cluster.kibana("PATCH", "/api/detection_engine/rules", {"id": uuid, "enabled": True})
        print(f"  re-enabled {uuid}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--kibana", required=True, help="Kibana URL, e.g. https://x.kb.us-west2.gcp.elastic-cloud.com or http://localhost:5601")
    p.add_argument("--es", help="ES URL; defaults to the Kibana URL with .kb. swapped for .es.")
    p.add_argument("--user", default="elastic")
    p.add_argument("--netrc", default="~/.netrc")
    p.add_argument("--space", default="default")
    p.add_argument("--days", type=int, default=14)
    p.add_argument("--min-fp", type=int, default=10)
    p.add_argument("--min-rate", type=int, default=50)
    p.add_argument("--runs", type=int, default=2, help="repeat each query: first run cold, later runs warm")
    p.add_argument("--skip-current", action="store_true", help="skip the current single query (minutes on a big index)")
    p.add_argument("--deleted-check", action="store_true", help="count rules with alerts but no enabled rule object")
    p.add_argument("--disable-top", action="store_true", help="disable the top candidate, rerun, re-enable")
    p.add_argument("--disable", metavar="UUID", help="same as --disable-top for a given rule")
    p.add_argument("--out", help="directory for full ES|QL responses (columns + values, with alert ids)")
    args = p.parse_args()

    cluster = Cluster(args)
    current_q, screen_q, harvest_q = build_queries(args.min_fp, args.min_rate)
    print(f"kibana={cluster.kb}\nes={cluster.es}\nwindow={args.days}d min_fp={args.min_fp} min_rate={args.min_rate}% runs={args.runs}")

    current = None
    if not args.skip_current:
        print("\ncurrent single query:")
        for _ in range(args.runs):
            current = run_current(cluster, current_q)

    pipeline = None
    for i in range(args.runs):
        print(f"\nenabled-first pipeline, run {i + 1}:")
        pipeline = run_pipeline(cluster, screen_q, harvest_q) or pipeline

    compare(current, pipeline)
    if pipeline and args.deleted_check:
        deleted_check(cluster, pipeline["enabled"])
    target = args.disable or (pipeline["rows"][0][0] if args.disable_top and pipeline and pipeline["rows"] else None)
    if target:
        disable_check(cluster, screen_q, harvest_q, target)


if __name__ == "__main__":
    main()
