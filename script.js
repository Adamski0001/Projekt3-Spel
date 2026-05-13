// ==========================================
// ELEVATOR BANK WITH TWO CARS (A AND B)
// Each car runs SCAN on its own queue.
// Inner panel presses go straight to that car's destinations.
// Hall buttons (up/down) are routed by a dispatcher to the best car.
// ==========================================

// Building configuration.
const totalFloors = 10;
const floorHeight = 50;

// Shared DOM references used across all helpers.
const display = document.querySelector('.elevator-display');
const btnResetDisplay = document.getElementById('btn-reset-display');

// Find the hall call button for a given floor and direction.
function $hallButton(floor, dir) {
  return document.querySelector(`.floor button[data-floor="${floor}"][data-direction="${dir}"]`);
}

// Find the badge that shows which car has taken a hall call.
function $badge(floor, dir) {
  return document.querySelector(`.assigned-badge[data-floor="${floor}"][data-direction="${dir}"]`);
}

// Find the inner panel button for a given car and floor.
function $panelButton(carId, floor) {
  return document.querySelector(`.panel[data-car="${carId}"] button[data-floor="${floor}"]`);
}

// Build a fresh car object with its own state and DOM handles. The factory
// keeps both cars symmetric so the rest of the code can treat them
// interchangeably as items in the cars array.
function makeCar(id) {
  return {
    id,
    currentFloor: 1,
    direction: 'idle', // 'up', 'down', or 'idle'
    destinations: new Set(),    // floors selected from inside this car
    assignedUp: new Set(),      // up hall calls routed to this car
    assignedDown: new Set(),    // down hall calls routed to this car
    isProcessing: false,
    elevatorEl: document.getElementById(`elevator-${id}`),
    leftDoorEl: document.querySelector(`.door-left[data-car="${id}"]`),
    rightDoorEl: document.querySelector(`.door-right[data-car="${id}"]`),
    floorNumberEl: document.querySelector(`.floor-number[data-car="${id}"]`),
    floorDirectionEl: document.querySelector(`.floor-direction[data-car="${id}"]`)
  };
}

const cars = [makeCar('a'), makeCar('b')];

// Tracks which car owns each hall call so the same call is never assigned twice.
// hallAssignments[floor] = { up: 'a' | 'b' | null, down: 'a' | 'b' | null }
const hallAssignments = {};
for (let f = 1; f <= totalFloors; f++) {
  hallAssignments[f] = { up: null, down: null };
}

// ==========================================
// HELPERS
// ==========================================

// Sleep helper backed by a Promise so the elevator loop can pace itself with await.
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Prepend a message to the on screen log so the newest entry sits on top.
function updateDisplay(message) {
  display.innerHTML = message + '<br>' + display.innerHTML;
}

// Sync the floor number and arrow shown in a car's indicator panel.
function updateFloorIndicator(car) {
  car.floorNumberEl.textContent = car.currentFloor;
  if (car.direction === 'up') car.floorDirectionEl.textContent = '▲';
  else if (car.direction === 'down') car.floorDirectionEl.textContent = '▼';
  else car.floorDirectionEl.textContent = '–';
}

// Total number of pending stops across all three of a car's queues.
function queueSize(car) {
  return car.destinations.size + car.assignedUp.size + car.assignedDown.size;
}

// Friendly label like "Hiss A" for log messages.
function carLabel(car) {
  return 'Hiss ' + car.id.toUpperCase();
}

// ==========================================
// DOORS AND MOVEMENT (per car)
// ==========================================

// Close the doors and resolve once the CSS transition has had time to finish.
function closeDoors(car) {
  return new Promise(resolve => {
    car.leftDoorEl.classList.remove('open');
    car.rightDoorEl.classList.remove('open');
    setTimeout(resolve, 1000);
  });
}

// Open the doors and resolve once the CSS transition has had time to finish.
function openDoors(car) {
  return new Promise(resolve => {
    car.leftDoorEl.classList.add('open');
    car.rightDoorEl.classList.add('open');
    setTimeout(resolve, 1000);
  });
}

// Move the car one floor in either direction. Resolves when the travel
// animation completes so the SCAN loop can await each step.
function moveOneFloor(car, targetFloor) {
  return new Promise(resolve => {
    const targetPos = (targetFloor - 1) * floorHeight;
    car.elevatorEl.style.transition = 'transform 1.5s linear';
    car.elevatorEl.style.transform = `translateY(-${targetPos}px)`;
    setTimeout(() => {
      car.currentFloor = targetFloor;
      updateFloorIndicator(car);
      resolve();
    }, 1500);
  });
}

// ==========================================
// SCAN LOGIC (per car)
// ==========================================

// True if any of the car's queues holds a floor above its current position.
function hasStopsAbove(car) {
  for (const f of car.destinations) if (f > car.currentFloor) return true;
  for (const f of car.assignedUp) if (f > car.currentFloor) return true;
  for (const f of car.assignedDown) if (f > car.currentFloor) return true;
  return false;
}

// True if any of the car's queues holds a floor below its current position.
function hasStopsBelow(car) {
  for (const f of car.destinations) if (f < car.currentFloor) return true;
  for (const f of car.assignedUp) if (f < car.currentFloor) return true;
  for (const f of car.assignedDown) if (f < car.currentFloor) return true;
  return false;
}

// True if the car still has any pending stops at all.
function hasAnyStops(car) {
  return car.destinations.size > 0 || car.assignedUp.size > 0 || car.assignedDown.size > 0;
}

// Decide whether the car should stop on the floor it's currently passing.
// A destination always wins. Hall calls only count when their direction
// matches the car's travel direction, except at the turnaround point where
// we also pick up the opposite direction so a waiting rider isn't skipped.
function shouldStopHere(car) {
  const f = car.currentFloor;
  if (car.destinations.has(f)) return true;
  if (car.direction === 'up' && car.assignedUp.has(f)) return true;
  if (car.direction === 'down' && car.assignedDown.has(f)) return true;
  if (car.direction === 'up' && !hasStopsAbove(car) && car.assignedDown.has(f)) return true;
  if (car.direction === 'down' && !hasStopsBelow(car) && car.assignedUp.has(f)) return true;
  return false;
}

// Clear the stop the car is currently fulfilling. Hall calls are only
// removed if this car is the one that was assigned to them, otherwise
// we'd silently steal a call from the other elevator.
function clearStopHere(car) {
  const floor = car.currentFloor;

  if (car.destinations.has(floor)) {
    car.destinations.delete(floor);
    const btn = $panelButton(car.id, floor);
    if (btn) btn.classList.remove('pushed');
  }

  // Release the hall call in one direction if this car owns it, and reset
  // the button and badge so the UI matches the new state.
  function tryClearHall(dir, carSet) {
    if (!carSet.has(floor)) return;
    if (hallAssignments[floor][dir] !== car.id) return;
    carSet.delete(floor);
    hallAssignments[floor][dir] = null;
    const btn = $hallButton(floor, dir);
    if (btn) btn.classList.remove('pushed');
    const badge = $badge(floor, dir);
    if (badge) {
      badge.classList.remove('visible');
      badge.textContent = '';
    }
  }

  if (car.direction === 'up') tryClearHall('up', car.assignedUp);
  if (car.direction === 'down') tryClearHall('down', car.assignedDown);
  // At the turnaround, also release the opposite direction call we just served.
  if (car.direction === 'up' && !hasStopsAbove(car)) tryClearHall('down', car.assignedDown);
  if (car.direction === 'down' && !hasStopsBelow(car)) tryClearHall('up', car.assignedUp);
}

// Handle a stop at the current floor: clear the call, open the doors,
// hold for boarding, then close again if there are more stops to make.
async function stopAtCurrentFloor(car) {
  clearStopHere(car);
  updateDisplay(carLabel(car) + ': stannar på våning ' + car.currentFloor);
  // Brief pause before the doors open so the 3D camera has time to settle.
  await delay(500);
  await openDoors(car);
  await delay(2000);
  if (hasAnyStops(car)) {
    await closeDoors(car);
  }
}

// Main loop for a single car. Picks a direction, walks floor by floor, and
// stops where SCAN says it should. The isProcessing flag prevents a second
// loop from starting on the same car while one is already running.
async function processElevator(car) {
  if (car.isProcessing) return;
  car.isProcessing = true;

  await closeDoors(car);

  while (hasAnyStops(car)) {
    // Reevaluate direction in case the last stop emptied the queue ahead.
    if (car.direction === 'up' && !hasStopsAbove(car)) {
      car.direction = hasStopsBelow(car) ? 'down' : 'idle';
    } else if (car.direction === 'down' && !hasStopsBelow(car)) {
      car.direction = hasStopsAbove(car) ? 'up' : 'idle';
    } else if (car.direction === 'idle') {
      if (hasStopsAbove(car)) car.direction = 'up';
      else if (hasStopsBelow(car)) car.direction = 'down';
    }

    updateFloorIndicator(car);
    if (car.direction === 'idle') break;

    // After a direction flip we may already be on a floor that wants service.
    if (shouldStopHere(car)) {
      await stopAtCurrentFloor(car);
      continue;
    }

    const nextFloor = car.direction === 'up' ? car.currentFloor + 1 : car.currentFloor - 1;
    if (nextFloor < 1 || nextFloor > totalFloors) {
      car.direction = car.direction === 'up' ? 'down' : 'up';
      continue;
    }

    await moveOneFloor(car, nextFloor);

    if (shouldStopHere(car)) {
      await stopAtCurrentFloor(car);
    }
  }

  car.direction = 'idle';
  updateFloorIndicator(car);
  car.leftDoorEl.classList.add('open');
  car.rightDoorEl.classList.add('open');
  car.isProcessing = false;
}

// ==========================================
// DISPATCHER (which car gets the hall call?)
// ==========================================

// Extra cost added when an idle car has to reverse direction to serve a call.
const WRONG_SIDE_PENALTY = 2;

// Estimate roughly how long it would take this car to reach (floor, dir).
// Lower is better. A small queue penalty nudges the dispatcher toward
// balancing load between the two cars.
function hallCost(car, floor, dir) {
  const dist = Math.abs(car.currentFloor - floor);
  const queuePenalty = 0.1 * queueSize(car);

  if (car.direction === 'idle') {
    // An idle car is "naturally placed" if reaching the call floor lets it
    // travel in the same direction the rider wants to go. For example, a
    // down call on floor 4 with the car on floor 8 is natural. A car on
    // floor 1 would have to go up first and then reverse.
    const naturallyPositioned =
      car.currentFloor === floor ||
      (dir === 'down' && car.currentFloor >= floor) ||
      (dir === 'up'   && car.currentFloor <= floor);
    return dist + queuePenalty + (naturallyPositioned ? 0 : WRONG_SIDE_PENALTY);
  }

  // Car is moving and will sweep past the call floor in the right direction.
  if (dir === 'up' && car.direction === 'up' && car.currentFloor <= floor) {
    return dist + queuePenalty;
  }
  if (dir === 'down' && car.direction === 'down' && car.currentFloor >= floor) {
    return dist + queuePenalty;
  }

  // Otherwise the car has to finish its current sweep and come back.
  return 2 * totalFloors + dist + queuePenalty;
}

// Score both cars for a hall call and hand it to the cheapest one.
// On ties we prefer the car whose position best matches the call direction,
// then idle over busy, then shorter queue, with car A as the final fallback.
function dispatchHallCall(floor, dir) {
  if (hallAssignments[floor][dir]) return; // already assigned

  const scored = cars.map(car => ({ car, cost: hallCost(car, floor, dir) }));
  const wrongDir = dir === 'down' ? 'up' : 'down';
  scored.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    // For down calls, prefer the higher car. For up calls, prefer the lower one.
    // We only apply this tiebreaker when neither car is actively heading the wrong way.
    const aOk = a.car.direction !== wrongDir;
    const bOk = b.car.direction !== wrongDir;
    if (aOk && bOk && a.car.currentFloor !== b.car.currentFloor) {
      return dir === 'down'
        ? b.car.currentFloor - a.car.currentFloor
        : a.car.currentFloor - b.car.currentFloor;
    }
    // Fall back to idle over busy, then shorter queue, then car A.
    const aIdle = a.car.direction === 'idle' ? 0 : 1;
    const bIdle = b.car.direction === 'idle' ? 0 : 1;
    if (aIdle !== bIdle) return aIdle - bIdle;
    const qa = queueSize(a.car), qb = queueSize(b.car);
    if (qa !== qb) return qa - qb;
    return a.car.id < b.car.id ? -1 : 1;
  });

  const winner = scored[0].car;
  if (dir === 'up') winner.assignedUp.add(floor);
  else winner.assignedDown.add(floor);
  hallAssignments[floor][dir] = winner.id;

  const badge = $badge(floor, dir);
  if (badge) {
    badge.textContent = winner.id.toUpperCase();
    badge.classList.add('visible');
  }

  updateDisplay(carLabel(winner) + ' tar våning ' + floor + ' (' + (dir === 'up' ? '▲' : '▼') + ')');
  processElevator(winner);
}

// ==========================================
// BUTTON LISTENERS
// ==========================================

// Inner panel presses only affect the car they belong to.
document.querySelectorAll('.panel button[data-floor]').forEach(btn => {
  btn.addEventListener('click', () => {
    const carId = btn.dataset.car;
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    const floor = parseInt(btn.dataset.floor);

    if (floor === car.currentFloor && !car.isProcessing) {
      updateDisplay(carLabel(car) + ' är redan på våning ' + floor);
      return;
    }
    if (car.destinations.has(floor)) return;

    car.destinations.add(floor);
    btn.classList.add('pushed');
    updateDisplay(carLabel(car) + ': våning ' + floor + ' vald');
    processElevator(car);
  });
});

// Hall calls go through the dispatcher so the system picks the best car.
document.querySelectorAll('.floor button[data-direction]').forEach(btn => {
  btn.addEventListener('click', () => {
    const floor = parseInt(btn.dataset.floor);
    const dir = btn.dataset.direction;

    if (hallAssignments[floor][dir]) return; // already assigned

    // If a car is already parked here doing nothing, the call is a no op.
    const carHere = cars.find(c => !c.isProcessing && c.currentFloor === floor);
    if (carHere) {
      updateDisplay(carLabel(carHere) + ' är redan på våning ' + floor);
      return;
    }

    btn.classList.add('pushed');
    updateDisplay('Anrop ' + (dir === 'up' ? '▲' : '▼') + ' våning ' + floor);
    dispatchHallCall(floor, dir);
  });
});

// Clear the message log on demand.
btnResetDisplay.addEventListener('click', () => {
  display.innerHTML = '';
});

// Render the starting state in both cars' indicator panels.
cars.forEach(updateFloorIndicator);
