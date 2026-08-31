# AGENTS.md

## Project Overview

This repository is the Egg.js back end for FEPerf, a front-end performance monitoring system. It receives browser performance reports, stores raw samples in MySQL, periodically aggregates them, and exposes monitoring APIs.

The application is a small CommonJS modular monolith. Egg auto-loads controllers, services, models, middleware, and schedules from `app/`; `app/router.js` is the HTTP route entry point.

## Runtime and Conventions

- Target compatibility: Node.js 10.x. `package.json` declares `node >=10.0.0`, and AppVeyor uses Node 10.
- Framework: Egg.js 2.x (`egg@^2.15.1`).
- Database: MySQL through `egg-sequelize` and `mysql2`.
- Cache/plugin state: `egg-redis` is enabled, but current application flows do not call Redis; topic counters live in `app.topicsCache` process memory.
- Module style: CommonJS (`require` and `module.exports`) with async/await; there is no TypeScript or transpilation step.
- Formatting: `.eslintrc` extends `eslint-config-egg`, prefers double quotes and semicolons, and reports most custom formatting and maintainability rules as warnings. Follow the checked-in ESLint config.
- Compatibility: do not introduce optional chaining, nullish coalescing, top-level `await`, ESM-only dependencies, or APIs unavailable in Node 10 unless the project is intentionally upgraded.

The Docker image currently uses Node 14, so container runtime and declared/CI compatibility do not match. Preserve Node 10 compatibility until that mismatch is deliberately resolved.

## Repository Map

```text
app/
  controller/       HTTP request handlers
  entities/         Response/error helpers and legacy utilities/config
  middleware/       Error normalization and global request logging
  model/            Sequelize models and table mappings
  schedule/         Egg background subscriptions
  service/          Performance/topic business and query logic
  router.js         Public HTTP route table
build/              Container/host startup scripts
config/             Egg plugins and environment configuration
database/           Empty Sequelize CLI configuration placeholder
example/            Legacy SDK loader HTML example
test/               Minimal Egg test scaffolding
Dockerfile          Container build and startup definition
DockerBuild.sh      Host-specific config copy and Docker redeployment script
package.json        Runtime dependencies, scripts, and Node compatibility
webpack.config.js   Legacy deploy bundling config; references missing deploy.js
```

## Active Components

### Routing and controllers

- `app/router.js` maps all public endpoints.
- `app/controller/home.js` implements the ping response. Its `testPost()` method is not routed.
- `app/controller/report.js` ingests raw reports, exposes the in-memory topic cache, and performs SDK sampling/redirect behavior.
- `app/controller/monitor.js` reads aggregates and raw history, manages topics, counts reports, and triggers manual backfills. Its `getCache()` method is not routed.

### Service and persistence

- `app/service/perf.js` owns topic creation/listing, raw SQL aggregation, aggregate persistence, and report counts.
- `app/model/PerfReportLog.js` maps `perf_report_log`, the raw browser-report table.
- `app/model/PerfStatistics.js` maps `perf_statistics`, the active/historical aggregate table.
- `app/model/PerfTopics.js` maps `perf_topics`, the monitored-project registry.

All three model modules call `.sync()` when Egg loads them. Model edits can therefore affect database schema during application startup; there is no migration workflow wired into the application.

### Middleware

- `requestLogger` is globally enabled by `config.middleware` in `config/config.default.js`.
- After each request, it logs the method/path locally and sends `{ log_type, content }` to an external HTTPS logging endpoint.
- It skips `/feperf/ping` and `/server/log/add`.
- Remote logging is fire-and-forget with a 3-second request timeout; errors are logged and do not change the API response.
- `errorHandler` normalizes thrown errors, but it is route-level rather than global. It is attached only to the ping and report/SDK routes in `app/router.js`; monitor routes do not use it.

### Scheduled jobs

- `app/schedule/get_topics.js`: every 30 minutes, `type: "all"`; every worker reloads enabled topics and rebuilds its own `app.topicsCache` while retaining that worker's current-day counters.
- `app/schedule/report_perf.js`: every 30 minutes, `type: "worker"`; one worker aggregates the current day for all enabled topics.
- `app/schedule/robot.js`: cron `0 15 10 * * *`, `type: "worker"`; it currently reads enabled topics but performs no notification or other side effect. Its `axios` and `deepCopyObject` imports are currently unused.

## Configuration

- `config/plugin.js` explicitly disables `egg-cors` with `enable: false`; the package remains listed in `dependencies`. Redis, Sequelize, and validation plugins are enabled.
- `config/config.default.js` disables CSRF, sets the cookie signing key, and enables `requestLogger`. There is no `config.cors` block.
- `config/config.local.js` contains local API and MySQL settings.
- `config/_config.prod.js` is a production-like template, not the filename Egg loads for production.
- `DockerBuild.sh` expects to copy an external sibling file into `config/config.prod.js` before building. Production configuration is therefore not self-contained in this repository.
- Do not copy credentials or sensitive config values into documentation, tests, or logs.

## HTTP API

| Method | Path | Handler | Data/side effect |
| --- | --- | --- | --- |
| GET | `/feperf/ping` | `home.index` | Returns the standard success envelope |
| GET | `/feperf/report` | `report.perf` | Inserts `ctx.query` directly into `perf_report_log` |
| GET | `/feperf/report/get-topics` | `report.cGetTopics` | Returns `app.topicsCache` |
| GET | `/feperf/sdk/loader` | `report.cLoadPerf` | Samples by `rate`; increments an in-memory counter and redirects to the remote SDK when selected |
| GET | `/feperf/monitor/perf/day` | `monitor.perfDay` | Reads active rows from `perf_statistics` |
| GET | `/feperf/monitor/run/perf-month` | `monitor.runPerfMonth` | Starts a date-range aggregate backfill and responds immediately |
| POST | `/feperf/monitor/add/topic` | `monitor.addTopic` | Inserts a topic if it does not already exist |
| GET | `/feperf/monitor/get/topic` | `monitor.getTopic` | Lists enabled topics, optionally filtered by `userName` |
| GET | `/feperf/monitor/get/count` | `monitor.getCount` | Counts rows in `perf_report_log` |
| GET | `/feperf/monitor/get/history` | `monitor.getHistory` | Runs raw SQL aggregation and returns Sequelize's raw query result |

Successful helper-generated responses generally use `{ ret, info, message, data }`. `getHistory` is an exception because it returns the raw Sequelize query result. Error helpers live in `app/entities/err.js` and `app/entities/response/index.js`.

## Data Model

### `perf_report_log`

Raw report rows keyed by `perf_id`. They include `topic`, environment/device attributes, navigation/performance timing values, payload sizes, `report_rate`, and `created_at`. Updates are not timestamped.

### `perf_statistics`

Aggregate rows keyed by `ss_id`, with topic, average timings, report count/day/hour, `created_at`, and `ss_status`. Before writing a new aggregate, the service marks existing rows for the same topic/day as `ss_status = 0`; readers select `ss_status = 1`.

The service calculates and passes `render_time_avg`, but the current `PerfStatistics` model does not declare that field. Treat model/service alignment as a known risk when changing aggregation fields.

### `perf_topics`

Topic registry keyed by `topic_id`, with project metadata, ownership/contact fields, `user_name`, and `switch`. Only rows with `switch = 1` are returned by normal topic queries.

## Data Flows

### Raw ingestion

`Browser SDK -> GET /feperf/report -> ReportController.perf -> PerfReportLog.create(ctx.query) -> MySQL`

The endpoint has no input validation and passes query parameters directly to Sequelize. Keep field validation and public-input risk in mind when changing it.

### SDK sampling

`Browser -> GET /feperf/sdk/loader -> inRate(rate) -> redirect to remote SDK or return JavaScript`

For selected requests, the controller increments today's counter in the matching `app.topicsCache` entry before redirecting. The counter is per process, is not persisted, and can reset on restart or diverge across workers.

### Topic cache refresh

`get_topics schedule -> PerfTopics.findAll(switch = 1) -> merge current-day worker counters -> app.topicsCache`

Because this schedule uses `type: "all"`, each worker maintains its own independent cache.

### Aggregation

`report_perf schedule or manual backfill -> PerfService.mGetPerf -> raw SQL over perf_report_log -> savePerfStatistics -> perf_statistics`

The SQL filters invalid/incomplete timings and only accepts `onload_time` values between 0 and 30000 ms. `getPerf()` interpolates `topic`, `startDay`, and `endDay` directly into SQL; do not expose new untrusted inputs to this path without parameterizing the query.

`report_perf` and `runPerfMonth` create async `reduce()` chains without awaiting the final promise. Their callers can complete before aggregation finishes, and failures may not propagate through the original request/job lifecycle.

### Request logging

`Any non-ignored request -> requestLogger finally block -> local console + external HTTPS log request`

Only method and path are included; query strings and request bodies are not sent by this middleware.

## Development and Operations

- `npm run dev`: installs dependencies from the npm registry, then starts Egg development mode.
- `npm run start-local`: starts a daemonized local Egg process on port `7414`.
- `npm run start-prod`: starts a daemonized production Egg process on port `7414`.
- `npm run test-local`: runs Egg tests.
- `npm test`: runs `npm run lint -- --fix`, then `npm run test-local`; this can modify linted files.
- `npm run lint`: lints the repository.
- `npm run lint:fix`: fixes JavaScript under the shell-expanded `./test/*` target only.
- `npm run cov`: runs coverage.

Container flow:

`Dockerfile -> node:14 -> copy repository -> build/start.sh -> npm ci -> npm run start-prod`

The container exposes `7414`. `DockerBuild.sh` maps host port `7415` to container port `7414`, but it also stops and removes all Docker containers on the host; do not run it casually or in shared environments.

## Tests and Legacy Files

- Test coverage is minimal. `test/app/controller/home.test.js` still expects `GET /` to return `hi, egg`, but no `/` route exists; the active health endpoint is `/feperf/ping`.
- `example/test.html` points to a legacy local URL (`127.0.0.1:7002/sdk/loader`) that does not match the current `/feperf/sdk/loader` route or port `7414`.
- `webpack.config.js` references `deploy.js`, which is absent, and is not connected to a package script.
- `database/config.json` is empty; although `sequelize-cli` is installed, no migrations or CLI workflow are checked in.
- `app/entities/tencentConf.js`, `utils.js`, and `response/sign.js` are not referenced by active application code.

## Safe Change Checklist

- Preserve Node 10 syntax and runtime compatibility.
- Use CommonJS and follow `.eslintrc`, including double quotes in JavaScript.
- Trace route changes through controller, service, model/raw SQL, middleware, and tests.
- Keep the response envelope stable unless an API contract change is intentional.
- Validate and parameterize public inputs before extending report ingestion or raw SQL paths.
- Treat model edits as startup schema changes because models call `.sync()`.
- Account for per-worker in-memory state when changing topic caching or counters.
- Account for global outbound request logging when adding sensitive paths.
- Do not run `DockerBuild.sh` without explicit intent to replace host Docker workloads and provide external production config.
- Update this file when routes, schedules, middleware, runtime versions, persistence, or deployment behavior changes.

## Recommended Reading Order

1. `package.json`
2. `config/plugin.js` and `config/config.default.js`
3. `app/router.js`
4. `app/middleware/request_logger.js` and `app/middleware/error_handler.js`
5. `app/controller/report.js` and `app/controller/monitor.js`
6. `app/service/perf.js`
7. `app/model/*.js`
8. `app/schedule/*.js`
9. `Dockerfile`, `build/start.sh`, and `DockerBuild.sh`
10. `test/app/controller/home.test.js`
