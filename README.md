# Network Load Balancing Simulator

An interactive, educational web application built with **React**, **Vite**, **Express**, and **Tailwind CSS v4** demonstrating how a network load balancer distributes client traffic across heterogeneous server fleets.

Features a **dual-application architecture**:
1. **Load Balancer Portal & Authoritative API** (Port 3000 / 5173): Server management, algorithm switcher, live visual pipeline, telemetry counters, and dynamic auto-scaling on overload.
2. **Standalone Client User Application** (`User/` on Port 5174): Standard transactional business form submitting discrete 1-to-1 requests with workload units, idempotency protection, and live request status tracking.

---

## 1. Quick Start & Execution Commands

### Terminal 1: Load Balancer Management Portal & Authoritative API (Port 3000)
```bash
# PowerShell or Bash
npm run dev
```
- Load Balancer UI: `http://localhost:3000`
- Authoritative REST API: `http://localhost:3000/api/state`

### Terminal 2: Standalone User Client Application (Port 5174)
```bash
# PowerShell or Bash
npm run dev:user
```
- User Application Form: `http://localhost:5174`

*Note: In the AI Studio preview container, both applications are also unified: you can access the "User Request Form" tab directly within the Load Balancer Portal navigation for single-window testing.*

---

## 2. System Architecture

```text
+------------------------------------+        HTTP POST /api/requests
|    Standalone User App (Port 5174) | ------------------------------------+
|  • Normal Transactional Form       |  (Idempotency key, workload units)  |
|  • 1 Submit = Exactly 1 Request    |                                     |
+------------------------------------+                                     |
                                                                           v
+------------------------------------+                         +------------------------+
| Load Balancer Portal (Port 3000)   |                         |  Authoritative Engine  |
|  • System Dashboard & Metrics      | <--- 1s State Polling - |  • Strict Capacity     |
|  • Live Visual Simulation Studio   |                         |  • Strict Concurrency  |
|  • Server Fleet Management         |                         |  • Elastic Auto-Scale  |
|  • 6 Load-Balancing Algorithms     |                         |  • REST API Service    |
+------------------------------------+                         +------------------------+
                                                                           |
                                      +------------------------------------+------------------------------------+
                                      |                                    |                                    |
                                      v                                    v                                    v
                           [Server A (Weight 5)]                [Server B (Weight 3)]                [Server C (Weight 2)]
                           Cap: 10 units | Conc: 3              Cap: 6 units | Conc: 2               Cap: 4 units | Conc: 2
```

---

## 3. Strict Capacity & Concurrency Enforcement

The engine enforces a rigorous separation between **Reserved Workload Units** and **Active Concurrency Connections**:

| Metric | Field | Description | Rejection Condition |
| :--- | :--- | :--- | :--- |
| **Reserved Workload** | `currentWorkload` | Cumulative resource units currently booked by in-flight tasks | `currentWorkload + incomingWorkload > maxCapacity` (e.g. $8 + 3 = 11 > 10 \to$ reject) |
| **Active Concurrency** | `activeRequests` | Number of simultaneous in-flight connections being processed | `activeRequests >= concurrencyLimit` (e.g. 3 active on limit of $3 \to$ reject/queue) |
| **Total Managed** | `totalAssigned` | Lifetime cumulative requests assigned to this node | Monotonically increasing audit counter |

When requests finish processing:
- `currentWorkload` is decremented by the request's `workloadUnits`.
- `activeRequests` is decremented by 1.
- Both headroom slots are immediately reclaimed, and any requests waiting in the admission queue are automatically processed.

---

## 4. Controlled Dynamic Auto-Scaling on Server Overload

When incoming traffic saturates the existing server fleet:
1. The load balancer checks if `autoScaleOnOverload` is enabled (default: `true`).
2. If all eligible servers are at maximum capacity or concurrency, the system identifies the saturated server and dynamically spawns an auto-scaled replica (e.g., `Server A (Auto-Replica 1)`).
3. The replica inherits the parent server's configuration (weight, maximum capacity, and concurrency limit).
4. The incoming request is allocated to the new replica, and an alert is broadcast to the portal.
5. Auto-scaling is bounded by `maxAutoScaledServers` (default: 8) to prevent uncontrolled resource exhaustion.

---

## 5. Implemented Algorithms

| Algorithm | Code | Formula & Principle | Best Suited For |
| :--- | :---: | :--- | :--- |
| **Round Robin** | `RR` | Cyclic rotation: `Index = (Index + 1) % EligibleServers.length` | Uniform hardware with identical tasks |
| **Weighted Round Robin** | `WRR` | Smooth NGINX-style deficit interleaving based on configured weights | Heterogeneous hardware under uniform duration tasks |
| **Least Connections** | `LC` | `Server = argmin(ActiveRequests_i)` | Long-running queries with variable execution durations |
| **Weighted Least Connections** | `WLC` | Normalized load score: `Score = ActiveRequests / Weight` | Non-uniform tasks across heterogeneous servers |
| **Capacity-Based Selection** | `CBS` | Headroom evaluation: `RemainingCapacity = MaxCapacity − CurrentWorkload` | Workload-constrained clusters with discrete RAM/CPU limits |
| **Least Connections (with Limits)**| `LCC`| Hard filters (`Workload ≤ Cap` & `Active < Conc`) $\to$ `min(Active/Weight)` | Production admission control preventing cascading crashes |

---

## 6. Verifiable Test Suite (22 Automated Tests)

Navigate to the **Self-Test Suite** in the navigation menu to run all 22 automated unit and integration tests:
- **Test 1-14**: Rotation correctness, WRR smooth interleaving, Least Connections selection, administrative state disabling, pause draining, history serialization, and stale callback elimination.
- **Test 15 (Test A)**: Single Form Submission (1 submit = exactly 1 request generated and routed).
- **Test 16 (Test B)**: Duplicate Form Submission Prevention (Idempotency key and button locking).
- **Test 17 (Test C)**: Capacity Enforcement (8 reserved + 3 incoming = 11 > 10 maxCapacity $\to$ admission denied).
- **Test 18 (Test D)**: Concurrency Limit Enforcement (3 active connections on limit of 3 $\to$ admission denied).
- **Test 19 (Test E)**: Algorithm Correctness Under Headroom Limits (routes to eligible server when primary is saturated).
- **Test 20 (Test F)**: Controlled Simulated Server Scaling (auto-replica spawned with matching specs on fleet saturation).
- **Test 21 (Test G)**: Request Completion and Capacity Recovery (workload units and connection slots reclaimed).
- **Test 22 (Test H)**: History and Telemetry Accuracy.
