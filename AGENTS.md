# AGENTS.md

## Project Summary

This repository is the Egg.js back-end for FEPerf, a front-end performance monitoring system. It accepts browser performance reports, stores raw samples in MySQL, exposes monitoring endpoints, and periodically aggregates raw data into summary statistics.

The codebase is written in CommonJS and is intended to run on Node.js 10.x. Keep compatibility with Node 10 when editing code unless the runtime is intentionally being upgraded across the project.

## Runtime Constraints

- Target runtime: Node.js 10.x
- Framework: Egg.js 2.x
- ORM: `egg-sequelize` with MySQL
- Cache / plugin: `egg-redis` is enabled, though most current flows use in-memory `app.topicsCache`
- Language style: CommonJS, async/await, no TypeScript build

Notes:

- `package.json` declares `engines.node >=10.0.0`.
- The checked-in `Dockerfile` currently uses `node:14`, which does not match the stated Node 10 target.
- Avoid introducing syntax or dependencies that require newer Node features such as optional chaining, nullish coalescing, top-level `await`, ESM-only packages, or APIs added after Node 10.

## Key Folders

### `app/`

Main Egg application code.

- `app/router.js`
  Registers HTTP routes and binds them to controllers.
- `app/controller/`
  Request handlers for reporting, monitoring, and ping endpoints.
- `app/service/`
  Business logic for topic management, querying raw performance data, and writing aggregated statistics.
- `app/model/`
  Sequelize models for the three MySQL tables:
  - `PerfReportLog`
  - `PerfStatistics`
  - `PerfTopics`
- `app/schedule/`
  Background jobs that refresh topic cache and roll up statistics.
- `app/middleware/`
  Error normalization middleware.
- `app/entities/`
  Shared response helpers and error-code mapping.

### `config/`

Egg configuration and plugin enablement.

- `config/plugin.js`
  Enables `cors`, `redis`, `sequelize`, and `validate`.
- `config/config.default.js`
  Base config: disables CSRF and enables permissive CORS.
- `config/config.local.js`
  Local MySQL connection settings.
- `config/_config.prod.js`
  Production-like template, but the actual deployment script expects `config/config.prod.js` to be copied in externally.

### `build/`

Container start scripts.

- `build/start.sh`
  Runs `npm ci` and `npm run start-prod` inside the container.
- `build/server-start.sh`
  Restarts the app from a fixed path on a host machine.

### `test/`

Egg test scaffolding. Current coverage is minimal, and `test/app/controller/home.test.js` appears outdated because it expects `GET /` to return `hi, egg`, while the router exposes `/feperf/ping`.

### `example/`

Example HTML page for SDK-related usage.

### `database/`

Contains `config.json`; no migration workflow is wired into the app itself.

## Entry Points

### Development / local boot

- `npm run dev`
  Installs dependencies and runs `egg-bin dev`
- `npm run start-local`
  Starts Egg in local mode on port `7414`

### Production-style boot

- `npm run start-prod`
  Starts Egg in prod mode on port `7414`
- `build/start.sh`
  Container command entrypoint
- `Dockerfile`
  Builds the runtime image and launches `build/start.sh`

### HTTP entry point

- `app/router.js`
  This is the central map of public endpoints.

### Background entry points

- `app/schedule/get_topics.js`
- `app/schedule/report_perf.js`
- `app/schedule/robot.js`

Egg loads these automatically as scheduled subscriptions.

## HTTP Surface

Defined in `app/router.js`:

- `GET /feperf/ping`
  Health check handled by `app/controller/home.js`
- `GET /feperf/report`
  Accepts raw SDK query parameters and writes a row into `perf_report_log`
- `GET /feperf/report/get-topics`
  Returns the in-memory topic cache
- `GET /feperf/sdk/loader`
  Sampling gate for SDK loading; may redirect to remote SDK URL
- `GET /feperf/monitor/perf/day`
  Returns aggregated daily statistics from `perf_statistics`
- `GET /feperf/monitor/run/perf-month`
  Manually triggers aggregation across a date range
- `POST /feperf/monitor/add/topic`
  Creates a new monitoring topic
- `GET /feperf/monitor/get/topic`
  Lists enabled topics
- `GET /feperf/monitor/get/count`
  Counts raw report rows
- `GET /feperf/monitor/get/history`
  Queries raw-report averages directly from `perf_report_log`

## Data Model

### `PerfReportLog`

Raw per-page-load reports from the SDK. Stored in table `perf_report_log`.

Important fields:

- `topic`
- environment/device metadata such as `os`, `network`, `device_type`
- timing metrics such as `dns_time`, `tcp_time`, `response_time`, `domready_time`, `onload_time`, `white_time`, `render_time`
- `report_rate`
- `created_at`

### `PerfStatistics`

Aggregated per-topic statistics stored in `perf_statistics`.

Important fields:

- `topic`
- average timing fields ending in `_avg`
- `report_count`
- `report_day`
- `report_hour`
- `ss_status`

`ss_status = 1` marks the latest active aggregate for a topic/day; older rows are marked `0`.

### `PerfTopics`

Topic registry stored in `perf_topics`.

Important fields:

- `topic`
- `project_name`
- `project_description`
- `owner`
- `department`
- `contact`
- `switch`
- `user_name`

## Data Flow

### 1. Raw report ingestion

Path:

`SDK/browser -> GET /feperf/report -> ReportController.perf -> PerfReportLog.create() -> MySQL`

Details:

- `app/controller/report.js#perf` writes `ctx.query` directly into `ctx.model.PerfReportLog`.
- There is no request validation in this path.
- The response is normalized through `rsp()`.

### 2. SDK loader / sampling flow

Path:

`Browser -> GET /feperf/sdk/loader -> ReportController.cLoadPerf -> inRate(rate)`

If sampled in:

- increments today’s count in `app.topicsCache`
- redirects the browser to `https://i.mazey.net/feperf/sdk/prd/report.js`

If sampled out:

- returns a small JavaScript payload that logs sampling info

### 3. Topic cache refresh

Path:

`Schedule get_topics -> PerfTopics.findAll() -> rebuild app.topicsCache`

Details:

- Runs every 30 minutes with `type: 'all'`
- Reads enabled topics from MySQL
- Rebuilds `ctx.app.topicsCache`
- Preserves today’s per-topic in-memory sample count when possible

This cache is used by:

- `GET /feperf/report/get-topics`
- `GET /feperf/sdk/loader`

### 4. Statistics aggregation

Path:

`Schedule report_perf -> service.perf.getTopic() -> service.perf.mGetPerf() -> service.perf.getPerf() -> service.perf.savePerfStatistics()`

Details:

- Runs every 30 minutes
- Iterates through active topics
- Computes aggregate averages from raw rows in `perf_report_log`
- Stores summarized rows in `perf_statistics`
- Marks older rows for the same topic/day as inactive by setting `ss_status = 0`

### 5. Monitoring reads

Two read paths exist:

- Aggregated view:
  `GET /feperf/monitor/perf/day -> queryPerfStatistics() -> perf_statistics`
- Raw-history computation:
  `GET /feperf/monitor/get/history -> getPerf() -> raw SQL over perf_report_log`

### 6. Manual backfill

Path:

`GET /feperf/monitor/run/perf-month -> Monitor.runPerfMonth -> repeated mGetPerf() calls`

This manually triggers daily aggregation for a date range, one day at a time.

## Important Implementation Notes

### Models sync on boot

Each Sequelize model calls `.sync()` during module initialization. That means application startup can create or alter tables depending on Sequelize behavior and database permissions. Be careful when changing model definitions.

### Raw SQL is built with string interpolation

`app/service/perf.js#getPerf` interpolates `topic`, `startDay`, and `endDay` directly into SQL text. Treat this as a high-risk area when modifying request inputs or opening new public paths.

### Topic cache is process memory

`app.topicsCache` is not Redis-backed. It is rebuilt by a schedule and lives in memory, so behavior can differ across workers or restarts.

### Some schedules use async `reduce` without awaiting completion

Several controller and schedule flows construct async reductions but do not await the final promise chain before returning. Keep that behavior in mind when debugging timing issues.

### Deployment assumptions are external

`DockerBuild.sh` expects a sibling path to provide `config/config.prod.js`. Production config is not fully self-contained inside this repository.

## Files To Read First

When making changes, start here:

1. `package.json`
2. `app/router.js`
3. `app/controller/report.js`
4. `app/controller/monitor.js`
5. `app/service/perf.js`
6. `app/model/*.js`
7. `app/schedule/*.js`
8. `config/config.default.js`
9. `config/config.local.js`

## Safe Change Guidelines

- Preserve Node 10 compatibility.
- Prefer CommonJS `require` / `module.exports`.
- Avoid modern syntax that would need transpilation.
- Keep API response shape consistent with helpers in `app/entities/response/index.js` and `app/entities/err.js`.
- Check whether a change affects both request-time flows and scheduled aggregation flows.
- If you change model fields, inspect the corresponding controller, service, raw SQL, and schedule logic together.
- If you change routing, update the stale tests.

## Useful Commands

- `npm run dev`
- `npm run start-local`
- `npm run test-local`
- `npm run lint`

## Suggested Future Cleanup

- Align actual runtime with Node 10 guidance or officially upgrade the project.
- Replace model `.sync()` boot behavior with migrations.
- Parameterize raw SQL in `app/service/perf.js`.
- Add request validation for reporting and topic-management endpoints.
- Refresh test coverage so it matches current routes.
