#!/usr/bin/env python3
"""Run the enabled-first harvest pipeline (find enabled rules -> screen -> harvest) once, verbosely.

Every request is printed as it is sent (URL and body), then its outcome on the
next line, then the full result rows. Queries come from rule_tuning_harvest_bench.py.

  python3 rule_tuning_harvest_pipeline.py --kibana https://<deployment>.kb.<region>.gcp.elastic-cloud.com --user elastic

Password: ES_PASSWORD, ~/.netrc (machine <es host> login <user> password <pw>), or a prompt.
"""
import argparse, base64, getpass, json, netrc, os, sys, time, urllib.error, urllib.parse, urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rule_tuning_harvest_bench import FP_FILTER, build_queries, es_url  # noqa: E402


def password(args, es_host):
    if os.environ.get("ES_PASSWORD"):
        return os.environ["ES_PASSWORD"]
    path = os.path.expanduser(args.netrc)
    if os.path.exists(path):
        found = netrc.netrc(path).authenticators(es_host)
        if found and found[0] == args.user:
            return found[2]
    return getpass.getpass(f"password for {args.user}: ")


def send(auth, method, url, body=None, headers=None):
    print(f"\n{method} {url}")
    if body is not None:
        print(json.dumps(body, indent=2))
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": auth, "Content-Type": "application/json", **(headers or {})})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            d, status = json.load(r), r.status
    except urllib.error.HTTPError as e:
        print(f"-> HTTP {e.code} after {time.time() - t0:.1f}s: {e.read().decode()}")
        sys.exit(1)
    return d, status, round(time.time() - t0, 2)


def print_rows(d):
    print("columns:", [c["name"] for c in d["columns"]])
    for row in d["values"]:
        print(json.dumps(row))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--kibana", required=True)
    p.add_argument("--es", help="defaults to the Kibana URL with .kb. swapped for .es.")
    p.add_argument("--user", default="elastic")
    p.add_argument("--netrc", default="~/.netrc")
    p.add_argument("--space", default="default")
    p.add_argument("--days", type=int, default=14)
    p.add_argument("--min-fp", type=int, default=10)
    p.add_argument("--min-rate", type=int, default=50)
    args = p.parse_args()

    kb = args.kibana.rstrip("/")
    es = es_url(args.es, kb)
    space = f"/s/{args.space}" if args.space != "default" else ""
    auth = "Basic " + base64.b64encode(f"{args.user}:{password(args, urllib.parse.urlparse(es).hostname)}".encode()).decode()
    _, screen_q, harvest_q = build_queries(args.min_fp, args.min_rate)
    esql_url = f"{es}/_query?allow_partial_results=false"
    base_filter = [{"range": {"@timestamp": {"gte": f"now-{args.days}d"}}}]
    must_not = [{"exists": {"field": "kibana.alert.group.index"}}]

    print("== step 0: list enabled rules")
    filt = urllib.parse.quote("alert.attributes.enabled: true and alert.attributes.consumer: siem")
    rules, status, took = send(auth, "GET", f"{kb}{space}/api/alerting/rules/_find?filter={filt}&per_page=10000&fields=revision",
                               headers={"kbn-xsrf": "true", "elastic-api-version": "2023-10-31"})
    enabled = rules["data"]
    ids = [r["id"] for r in enabled]
    keys = "," + ",".join(f'{r["id"]}@{r["revision"]}' for r in enabled) + ","
    print(f"-> HTTP {status} in {took}s: {len(ids)} enabled rules (total {rules['total']})")
    for r in enabled:
        print(json.dumps({"id": r["id"], "revision": r["revision"]}))
    if not ids:
        print("no enabled rules, the workflow would skip the screen")
        return

    print("\n== step 1: screen rule FP rates")
    body = {"query": screen_q, "filter": {"bool": {"filter": base_filter + [{"terms": {"kibana.alert.rule.uuid": ids}}], "must_not": must_not}}}
    screen, status, took = send(auth, "POST", esql_url, body)
    print(f"-> HTTP {status} in {took}s, ES took {screen['took']}ms, documents_found {screen.get('documents_found')}: {len(screen['values'])} rows")
    print_rows(screen)
    screened = [row for row in screen["values"] if row[3] in keys]
    stale = [row[0] for row in screen["values"] if row[3] not in keys]
    print(f"current revision: {len(screened)} rows; dropped as stale revision: {stale}")
    if not screened:
        print("nothing screened, the workflow would skip the harvest")
        return

    print("\n== step 2: harvest FP alerts by rule")
    body = {"query": harvest_q, "filter": {"bool": {
        "filter": base_filter + FP_FILTER + [{"terms": {"kibana.alert.rule.uuid": [row[0] for row in screened]}}], "must_not": must_not}}}
    harvest, status, took = send(auth, "POST", esql_url, body)
    print(f"-> HTTP {status} in {took}s, ES took {harvest['took']}ms, documents_found {harvest.get('documents_found')}: {len(harvest['values'])} rows")
    print_rows(harvest)

    print("\n== candidates")
    totals = {row[3]: row for row in screen["values"]}
    for row in harvest["values"]:
        t = totals[row[4]]
        n = len(row[3]) if isinstance(row[3], list) else 1
        print(f"{row[0]}  fp_count={row[1]}  last_fp_at={row[2]}  total_count={t[1]}  fp_rate_count={t[2]}  alert_ids={n}")


if __name__ == "__main__":
    main()
