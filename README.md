# Network Load Balancing Simulator

An interactive, educational web application built with **React**, **Vite**, and **Tailwind CSS v4** demonstrating how a network load balancer distributes client traffic across heterogeneous server fleets.

---

## 1. Quick Start & Commands

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server (port 3000)
npm run dev

# 3. Build for production distribution
npm run build
```

---

## 2. Core Features

- **Actual Algorithmic Logic**: 6 real load-balancing algorithms implemented in pure JavaScript (no mocks or fake formulas).
- **Live Pipeline Visualization**: Full `Clients → Load Balancer Hub → Server Cluster` visualization with animated request transit, in-flight execution, and dynamic load indicators.
- **Transparent Decision Traces**: Human-readable, beginner-friendly explanations generated dynamically for every routing decision (e.g. why Server B was chosen over Server A and C).
- **Fleet Admission Control**: Strict enforcement of concurrency limits (`Active ≤ Concurrency Limit`) and maximum capacities (`Active ≤ Max Capacity`), with configurable queueing or rejection policies.
- **Administrative Server States**: Toggle servers between Online, Administratively Disabled, and Paused (allowing in-flight requests to drain while rejecting new admissions).
- **Repeatable Benchmark Comparisons**: Deterministic side-by-side performance benchmarks running the exact same workload across all 6 algorithms.
- **Audit History & CSV Export**: Searchable, filterable audit log persisted in `localStorage` with full JSON decision snapshots and CSV file export.
- **Automated Self-Test Suite**: 14 automated verification tests executable directly in the UI proving rotation correctness, weight proportionalities, concurrency enforcement, and stale callback elimination.

---

## 3. Implemented Algorithms

| Algorithm | Code | Selection Formula & Principle | Best Suited For |
| :--- | :---: | :--- | :--- |
| **Round Robin** | `RR` | Cyclic rotation: `Index = (Index + 1) % EligibleServers.length` | Homogeneous hardware with uniform request execution times |
| **Weighted Round Robin** | `WRR` | Smooth NGINX-style deficit interleaving based on configured weight ratios | Heterogeneous hardware under uniform request processing loads |
| **Least Connections** | `LC` | `Server = argmin(ActiveRequests_i)` with deterministic tie-breaking | Workloads with non-uniform processing durations (e.g., long polling) |
| **Weighted Least Connections** | `WLC` | Normalized load score: `Score = ActiveRequests / Weight` | Heterogeneous servers handling unpredictable, variable durations |
| **Capacity-Based Selection** | `CBS` | Headroom evaluation: `RemainingCapacity = MaxCapacity − ActiveRequests` | Memory-constrained systems with hard allocation quotas |
| **Least Connections (with Limits)** | `LCC` | Strict admission filter (`Active < Concurrency & Active < Capacity`) → `min(Active/Weight)` | Production-grade admission control preventing cascading server failures |

---

## 4. Default Demo Scenario

Clicking the **"Load Demo Scenario"** button in the header configures the standard college evaluation topology:

1. **5 Origin Clients**:
   - `cli-1`: Client 1 — Web Browser (`Browser`)
   - `cli-2`: Client 2 — Mobile App (`Mobile App`)
   - `cli-3`: Client 3 — Desktop App (`Desktop App`)
   - `cli-4`: Client 4 — API Client (`API Client`)
   - `cli-5`: Client 5 — Test Runner (`Custom`)

2. **3 Target Servers**:
   - **Server A (High-Capacity)**: Weight = 5, Max Capacity = 10, Concurrency Limit = 3
   - **Server B (Medium-Capacity)**: Weight = 3, Max Capacity = 6, Concurrency Limit = 2
   - **Server C (Standard)**: Weight = 2, Max Capacity = 4, Concurrency Limit = 2

3. **Standard Workload**:
   - 3 requests per client = 15 total requests.

---

## 5. Architectural Separation

```
src/
├── components/          # Reusable UI primitives (Modals, Headers, Charts, Confirmations)
│   ├── ConfirmModal.jsx
│   ├── Header.jsx
│   ├── Modal.jsx
│   ├── ServerLoadChart.jsx
│   └── Sidebar.jsx
├── context/             # SimulationContext: Central reactive simulation state
│   └── SimulationContext.jsx
├── engine/              # Pure algorithmic and deterministic evaluation logic
│   ├── algorithms.js    # 6 Load Balancing Algorithms
│   ├── tests.js         # 14 Automated Assertion Tests
│   └── validation.js    # Input and batch validation rules
├── pages/               # Primary application views
│   ├── AlgorithmComparison.jsx
│   ├── ClientManagement.jsx
│   ├── Dashboard.jsx
│   ├── RequestHistory.jsx
│   ├── ServerManagement.jsx
│   ├── SettingsPanel.jsx
│   ├── SimulationStudio.jsx
│   └── TestSuite.jsx
├── storage/             # Namespaced localStorage persistence layer
│   └── localStorage.js
├── App.jsx              # Main layout and tab router
├── index.css            # Base Tailwind styles and VS Code scrollbars
└── main.jsx             # React root mount
```

---

## 6. Known Educational Model Limitations

1. **Simulated Timing**: Request processing times use JavaScript browser timers (`setTimeout`) rather than physical network socket round-trips.
2. **Single-Threaded Dispatch**: All load-balancing evaluations run inside the browser thread; real-world hardware load balancers (e.g. F5, HAProxy, AWS ALB) distribute packet processing across kernel network queues.
3. **Storage Boundary**: Data is persisted in client browser `localStorage` and is isolated per browser profile; it is not a distributed backend database.
