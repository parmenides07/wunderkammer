
*An experiment in local rules, shared environments, and emergent structure.*  
Python · Pygame · Agent-based simulation

Vivarium is a small, discrete-time simulation of a colony inhabiting a changing landscape. Ten inhabitants explore, gather fungus, build paths through rock and water, and exchange information about resources. Six grazing animals inhabit the same environment, consuming and dispersing fungus. The inhabitants are not directed individually: they choose tasks from their own state, what they know, and the needs of a shared colony.

The motivation was to study how a system can acquire structure without that structure being prescribed explicitly. A trail, for example, need not be drawn by a planner. It can arise because the movements of many individuals change the cost of subsequent movement. Vivarium is a deliberately modest model of such interactions, rather than an attempt at realistic ecology or general intelligence.

![vivariummain](assets/vivariummain.mp4)

## The world as a state-transition system

The environment is a $48 \times 32$ lattice. Each tile has a terrain type and additional state: fungus quantity, garden status, trail wear, and age. Rock and unbridged water obstruct movement; floor and bridges permit it. Agents, construction jobs, and their relationships are represented separately from the tile grid.

A useful abstraction is

$$
S_t=(T_t,A_t,J_t,G_t), \qquad S_{t+1}=F(S_t;\xi_t),
$$

where $T_t$ contains tile and resource state, $A_t$ contains the agents' positions, tasks, routes, and memories, $J_t$ contains designated work, and $G_t$ is the current proximity graph. The term $\xi_t$ denotes the pseudorandom choices made during an update. Randomness is generated from a fixed seed, so a run can be reproduced given the same seed and sequence of inputs.

The model advances in ticks rather than continuous time. On an update, the world advances its clock, refreshes agent observations and decisions, resolves their proposed movements, updates the environment, and rebuilds local relationships. Some processes operate less frequently: ecology is updated every five ticks, while neighboring inhabitants exchange knowledge every twelve. Their interaction occurs through the common world state, not through a central controller deciding what the colony should do next.

This separation is useful both conceptually and programmatically. It makes a simulation tick an explicit transformation of state, independent of how frequently the screen is redrawn.

## Decisions, tasks, and work

Each inhabitant maintains a small amount of persistent state: its position, previous position, current task, target, route, remembered food locations, whether it is carrying food, and how long it has been blocked. Its behavior is a finite collection of rules rather than a learned policy.

An idle inhabitant chooses among foraging, construction, and exploration according to what is presently possible. Carrying food takes precedence over new work: it must be delivered to the common pantry. When pantry supplies are low, the inhabitants favor known, sufficiently mature fungus. Otherwise they may claim a reachable job or wander in search of new resources. Different inhabitants can therefore make different decisions in the same environment simply because they have different memories or occupy different positions.

The behavioral code distinguishes **choosing a task**, **traveling to it**, and **performing the action on arrival**. This avoids mixing questions of intention with questions of navigation. Foraging illustrates the distinction: harvesting changes the fungus tile and gives the inhabitant something to carry, but does not increase the pantry. The shared supply increases only once the inhabitant physically returns home. Resource collection therefore has a spatial and temporal cost.

The player can also designate excavation, bridge construction, or planting. Jobs have a location, an optional assigned worker, and progress. A worker excavating rock cannot stand inside the rock it is removing; instead, navigation searches for a reachable adjacent tile from which the job can be performed. Consequently, initially inaccessible work may become reachable after earlier excavation opens a passage. The same idea applies to extending bridges across water.

## Navigation and simultaneous motion

Movement uses **A\*** search over the four-connected walkable grid. Given a cell $n$, A\* prioritizes

$$
f(n)=g(n)+h(n),
$$

where $g(n)$ is the accumulated cost of a route and $h(n)$ estimates the remaining cost. The heuristic is six times the Manhattan distance to the nearest permitted goal:

$$
h(n)=6\min_{q\in Q}\bigl(|n_x-q_x|+|n_y-q_y|\bigr).
$$

Here $Q$ can contain several acceptable destinations, as when a worker merely needs to stand next to a construction site. A normal step costs 10; established trails reduce this cost to as little as 6; an occupied intermediate cell incurs an additional penalty of 15. Rock and unbridged water are impassable. The heuristic's coefficient is the minimum ordinary traversal cost, so it does not overestimate the remaining cost under these rules.

These costs mean that the shortest geometric route need not be the cheapest route. An inhabitant may favor a longer, worn trail over a direct crossing through untouched ground. The terrain thus influences navigation even before it becomes an explicit obstacle.

Pathfinding does not, however, solve the problem of several inhabitants moving at once. If agents were moved sequentially, the result would depend unnecessarily on iteration order: the first agent would occupy its destination before the others could act. Vivarium instead collects proposed destinations and resolves them as a group. Competing proposals are settled with a priority that rotates over time, so the same inhabitants do not always win. Moves into occupied cells are conditional on those occupants also moving away; invalid dependencies are removed until the remaining set of movements is consistent. This permits swaps and coordinated movement through narrow spaces without permitting collisions.

Agents that remain blocked can replan their routes and, after sufficiently long obstruction, abandon the task. Planning and execution are therefore distinct: a route expresses an intention, not a guarantee that every step will be available when attempted.

![pathfinding](assets/vivariumpath.mp4)

## A graph of incomplete knowledge

The navigation grid is one graph, but Vivarium also maintains a second, dynamic graph of social proximity. Inhabitants are represented by nodes; an edge connects two inhabitants when they are within a short distance of one another. These relationships are reconstructed as the agents move.

An inhabitant discovers fungus within a local observation radius and stores the coordinates in a set of remembered locations. Every twelve ticks, neighboring inhabitants share these memories. Crucially, the exchange uses **snapshots** taken before the update: if $A$ informs $B$, and $B$ is connected to $C$, the discovery does not immediately pass from $A$ through $B$ to $C$ in that same exchange. It can progress another edge only during a subsequent exchange.

This is a simple form of information propagation over a time-varying graph. No inhabitant possesses a complete global map of resources, and the information it does possess may become stale. Collective access to knowledge is consequently a product of encounters, rather than a shared omniscient database. The implementation is intentionally elementary, but it creates a meaningful distinction between the actual state of the world and an agent's partial representation of it.

## Ecology and feedback

The landscape has its own dynamics. Fungus grows, matures, ages, and sometimes spreads to neighboring cells. Gardens alter growth, while grazers seek and consume fungus and can contribute to its dispersal. Inhabitants harvest from the same finite patches and can cultivate new ones. These processes affect where agents travel and what work becomes worthwhile.

A second feedback mechanism is written directly into the terrain. Repeated traversal increases a tile's trail value; higher trail values lower future navigation costs; unused trails gradually decay. Schematically,

$$
\text{movement}\;\longrightarrow\;\text{trail wear}
\;\longrightarrow\;\text{lower route cost}
\;\longrightarrow\;\text{future movement}.
$$

There is no explicit road-building behavior in the inhabitants' decision rules. Routes can nevertheless become reinforced through use. This is the aspect of Vivarium I find most interesting: agents act on an environment that, in turn, records the consequences of their actions and influences later decisions.

![overview](assets/vivariumspeed.mp4)

## Implementation and representation

The project separates simulation from presentation. `worlds/burrow.py` owns the world and its update rules; `entities/` contains agent state; `engine/navigation.py` implements A\*; `engine/graph.py` provides the relationship structures. `main.py` handles timing and input, while `renderer/` reads the current state and draws it. The simulation can run without a Pygame window, which makes seeded experiments and automated tests possible.

The interface uses a hand-drawn atlas of $5\times5$ pixel glyphs, enlarged by integer scaling to preserve their edges. Terrain is rendered from tile state, including different rock-edge configurations, changing fungus sprites, and animated water. The carved wooden frame surrounds the simulation as an overlay. These are visual interpretations of the world, not additional simulation rules.

At normal speed the model advances at six ticks per second, while the display can redraw much more frequently. To prevent motion from appearing as a succession of jumps, an agent is drawn between its previous and current tile positions using linear interpolation:

$$
p_{\mathrm{draw}}=(1-\alpha)p_{t-1}+\alpha p_t, \qquad 0\leq\alpha\leq1.
$$

Thus the simulation remains discrete and deterministic under a fixed sequence of inputs, even as the display shows continuous-looking motion.

## Scope and observations

Vivarium is not a model of intelligent social organization in any strong sense. Its agents use authored priorities, its knowledge consists largely of remembered coordinates, and its ecology is intentionally schematic. The purpose was to build a small system in which the rules are understandable individually, yet their effects are not entirely isolated.

The most instructive problems were not the individual behaviors but their interfaces: planning around cells that may be occupied, resolving movements consistently, preventing information from propagating instantaneously, and allowing environmental history to change future choices. Those are the places where a collection of simple rules begins to behave like a coupled system.

Vivarium is a completed experiment at this scale. Its value to me is less in the sophistication of any one algorithm than in the opportunity to construct, inspect, and reason about a world whose behavior comes from the interaction of several modest mechanisms.
