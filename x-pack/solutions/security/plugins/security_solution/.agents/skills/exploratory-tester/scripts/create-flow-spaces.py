#!/usr/bin/env python3
"""Create session-owned per-flow Kibana spaces for parallel-mode isolation."""

import argparse
import json
import sys
from pathlib import Path

from session_resources import (
    build_auth_args,
    edit_session_config,
    ensure_session_manifest,
    is_owned_resource,
    is_pending_resource,
    namespaced_flow_space_id,
    reconcile_pending_resource,
    register_resource,
    resource_state,
    run_curl,
    write_session_config,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--session-dir",
        required=True,
        help="Path to the session directory (contains config.json)",
    )
    args = parser.parse_args()

    config_path = Path(args.session_dir) / "config.json"
    with edit_session_config(config_path) as config:
        if config.get("mode") != "parallel":
            print("Not parallel mode — no per-flow spaces needed.")
            return 0

        session_id = ensure_session_manifest(config)
        write_session_config(config_path, config)
        url = config["environment"]["url"].rstrip("/")
        base_space_id = config["environment"].get(
            "space_id", "exploratory-testing"
        )

        try:
            auth_args = build_auth_args(config)
        except ValueError as exc:
            print(str(exc), file=sys.stderr)
            return 1

        errors: list[dict[str, object]] = []

        for flow_number, flow in enumerate(config["flows"], 1):
            if not flow.get("isolate", True):
                flow["space_id"] = base_space_id
                print(
                    f"Flow {flow_number} ({flow['name']!r}): "
                    f"isolate=false → sharing {base_space_id!r}"
                )
                write_session_config(config_path, config)
                continue

            space_id = namespaced_flow_space_id(session_id, flow_number)
            endpoint = f"/api/spaces/space/{space_id}"
            existing_resource = next(
                (
                    resource
                    for resource in config["session_resources"]
                    if resource.get("kind") == "kibana_space"
                    and resource.get("id") == space_id
                ),
                None,
            )
            pending_before_remote = is_pending_resource(
                config,
                kind="kibana_space",
                resource_id=space_id,
            )
            pending_reservation = pending_before_remote or existing_resource is None
            if existing_resource is None:
                register_resource(
                    config,
                    kind="kibana_space",
                    resource_id=space_id,
                    owned=False,
                    endpoint=endpoint,
                    track_flow_space=False,
                    state="pending",
                )
                write_session_config(config_path, config)
            elif resource_state(existing_resource) == "pending":
                write_session_config(config_path, config)
            body = json.dumps(
                {
                    "id": space_id,
                    "name": f"Exploratory Testing — Flow {flow_number}",
                    "color": "#DD0A73",
                }
            )

            try:
                http_code, response_body = run_curl(
                    [
                        "curl",
                        "-s",
                        "-w",
                        "\n%{http_code}",
                        *auth_args,
                        "-X",
                        "POST",
                        f"{url}/api/spaces/space",
                        "-H",
                        "kbn-xsrf: true",
                        "-H",
                        "Content-Type: application/json",
                        "-d",
                        body,
                    ]
                )
            except TimeoutError as exc:
                http_code = "000"
                response_body = str(exc)

            if http_code == "200":
                flow["space_id"] = space_id
                register_resource(
                    config,
                    kind="kibana_space",
                    resource_id=space_id,
                    owned=True,
                    endpoint=endpoint,
                )
                print(
                    f"Flow {flow_number} ({flow['name']!r}): "
                    f"space {space_id!r} created"
                )
            elif http_code == "409":
                flow["space_id"] = space_id
                # A 409 against a reservation made in this run proves the space
                # pre-existed the session, so reuse is correct here.
                register_resource(
                    config,
                    kind="kibana_space",
                    resource_id=space_id,
                    owned=is_owned_resource(
                        config, kind="kibana_space", resource_id=space_id
                    )
                    or pending_before_remote,
                    endpoint=endpoint,
                    allow_pending_downgrade=True,
                )
                print(
                    f"Flow {flow_number} ({flow['name']!r}): "
                    f"space {space_id!r} already exists — reusing"
                )
            else:
                if pending_reservation:
                    try:
                        probe_status, _ = run_curl(
                            [
                                "curl",
                                "-s",
                                "-o",
                                "/dev/null",
                                "-w",
                                "\n%{http_code}",
                                *auth_args,
                                "-X",
                                "GET",
                                f"{url}{endpoint}",
                            ]
                        )
                    except TimeoutError:
                        probe_status = "000"
                    reconciliation = reconcile_pending_resource(
                        config,
                        kind="kibana_space",
                        resource_id=space_id,
                        endpoint=endpoint,
                        http_code=probe_status,
                        track_flow_space=True,
                    )
                else:
                    reconciliation = "reused"
                    probe_status = "not-probed"

                if reconciliation == "owned":
                    flow["space_id"] = space_id
                    print(
                        f"Flow {flow_number} ({flow['name']!r}): "
                        f"space {space_id!r} found after HTTP {http_code}; "
                        "reconciled as owned"
                    )
                else:
                    flow["space_id"] = base_space_id
                    errors.append(
                        {
                            "flow": flow_number,
                            "space": space_id,
                            "http_code": http_code,
                            "probe_status": probe_status,
                            "body": response_body,
                        }
                    )
                    print(
                        f"Flow {flow_number} ({flow['name']!r}): "
                        f"space creation failed (HTTP {http_code}) — "
                        f"falling back to shared space {base_space_id!r}; "
                        f"pending reconciliation: {reconciliation}",
                        file=sys.stderr,
                    )

            write_session_config(config_path, config)

        created_count = len(config["created_flow_spaces"])
        reused_count = len(config["reused_flow_spaces"])
        print(
            f"\n{created_count} per-flow space(s) created, "
            f"{reused_count} reused. {len(errors)} fallback(s)."
        )
        if errors:
            print(
                f"Fallback details: {json.dumps(errors, indent=2)}",
                file=sys.stderr,
            )

        return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
