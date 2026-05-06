// ==========================================
// HISSBANK MED TVÅ HISSAR (A + B)
// Varje hiss kör SCAN på sin egen kö.
// Inre panel-knappar landar bara hos den hissens egen destination.
// Våningsknappar (upp/ned) tilldelas av en dispatcher till bästa hiss.
// ==========================================

// --- Konstanter ---
const totalFloors = 10;
const floorHeight = 50;

// --- Delade DOM-element ---
const display = document.querySelector('.elevator-display');
const btnResetDisplay = document.getElementById('btn-reset-display');

// --- DOM-hjälpare ---
function $hallButton(floor, dir) {
  return document.querySelector(`.floor button[data-floor="${floor}"][data-direction="${dir}"]`);
}
function $badge(floor, dir) {
  return document.querySelector(`.assigned-badge[data-floor="${floor}"][data-direction="${dir}"]`);
}
function $panelButton(carId, floor) {
  return document.querySelector(`.panel[data-car="${carId}"] button[data-floor="${floor}"]`);
}

// --- Hissinstanser ---
function makeCar(id) {
  return {
    id,
    currentFloor: 1,
    direction: 'idle', // 'up' | 'down' | 'idle'
    destinations: new Set(),    // valda inifrån denna hiss
    assignedUp: new Set(),      // hall-up-anrop tilldelade denna hiss
    assignedDown: new Set(),    // hall-down-anrop tilldelade denna hiss
    isProcessing: false,
    elevatorEl: document.getElementById(`elevator-${id}`),
    leftDoorEl: document.querySelector(`.door-left[data-car="${id}"]`),
    rightDoorEl: document.querySelector(`.door-right[data-car="${id}"]`),
    floorNumberEl: document.querySelector(`.floor-number[data-car="${id}"]`),
    floorDirectionEl: document.querySelector(`.floor-direction[data-car="${id}"]`)
  };
}

const cars = [makeCar('a'), makeCar('b')];

// hallAssignments[floor] = { up: 'a'|'b'|null, down: 'a'|'b'|null }
const hallAssignments = {};
for (let f = 1; f <= totalFloors; f++) {
  hallAssignments[f] = { up: null, down: null };
}

// ==========================================
// HJÄLPFUNKTIONER
// ==========================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateDisplay(message) {
  display.innerHTML = message + '<br>' + display.innerHTML;
}

function updateFloorIndicator(car) {
  car.floorNumberEl.textContent = car.currentFloor;
  if (car.direction === 'up') car.floorDirectionEl.textContent = '▲';
  else if (car.direction === 'down') car.floorDirectionEl.textContent = '▼';
  else car.floorDirectionEl.textContent = '–';
}

function queueSize(car) {
  return car.destinations.size + car.assignedUp.size + car.assignedDown.size;
}

function carLabel(car) {
  return 'Hiss ' + car.id.toUpperCase();
}

// ==========================================
// DÖRRAR + RÖRELSE (per hiss)
// ==========================================

function closeDoors(car) {
  return new Promise(resolve => {
    car.leftDoorEl.classList.remove('open');
    car.rightDoorEl.classList.remove('open');
    setTimeout(resolve, 1000);
  });
}

function openDoors(car) {
  return new Promise(resolve => {
    car.leftDoorEl.classList.add('open');
    car.rightDoorEl.classList.add('open');
    setTimeout(resolve, 1000);
  });
}

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
// SCAN-LOGIK (per hiss)
// ==========================================

function hasStopsAbove(car) {
  for (const f of car.destinations) if (f > car.currentFloor) return true;
  for (const f of car.assignedUp) if (f > car.currentFloor) return true;
  for (const f of car.assignedDown) if (f > car.currentFloor) return true;
  return false;
}

function hasStopsBelow(car) {
  for (const f of car.destinations) if (f < car.currentFloor) return true;
  for (const f of car.assignedUp) if (f < car.currentFloor) return true;
  for (const f of car.assignedDown) if (f < car.currentFloor) return true;
  return false;
}

function hasAnyStops(car) {
  return car.destinations.size > 0 || car.assignedUp.size > 0 || car.assignedDown.size > 0;
}

function shouldStopHere(car) {
  const f = car.currentFloor;
  if (car.destinations.has(f)) return true;
  if (car.direction === 'up' && car.assignedUp.has(f)) return true;
  if (car.direction === 'down' && car.assignedDown.has(f)) return true;
  // Vändpunkt: plocka upp även motsatt riktning
  if (car.direction === 'up' && !hasStopsAbove(car) && car.assignedDown.has(f)) return true;
  if (car.direction === 'down' && !hasStopsBelow(car) && car.assignedUp.has(f)) return true;
  return false;
}

// Klar ett anrop på aktuell våning. Hall-anrop rensas bara om denna hiss
// faktiskt äger anropet (annars stjäl vi från andra hissen).
function clearStopHere(car) {
  const floor = car.currentFloor;

  if (car.destinations.has(floor)) {
    car.destinations.delete(floor);
    const btn = $panelButton(car.id, floor);
    if (btn) btn.classList.remove('pushed');
  }

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
  // Vändpunkt: rensa motsatt riktning också
  if (car.direction === 'up' && !hasStopsAbove(car)) tryClearHall('down', car.assignedDown);
  if (car.direction === 'down' && !hasStopsBelow(car)) tryClearHall('up', car.assignedUp);
}

async function stopAtCurrentFloor(car) {
  clearStopHere(car);
  updateDisplay(carLabel(car) + ': stannar på våning ' + car.currentFloor);
  // Kort paus innan dörrarna öppnas — ger 3D-kameran tid att fokusera.
  await delay(500);
  await openDoors(car);
  await delay(2000);
  if (hasAnyStops(car)) {
    await closeDoors(car);
  }
}

async function processElevator(car) {
  if (car.isProcessing) return;
  car.isProcessing = true;

  await closeDoors(car);

  while (hasAnyStops(car)) {
    // Uppdatera riktning
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

    // Stoppa på aktuell våning (t.ex. efter riktningsbyte)
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
// DISPATCHER (vilken hiss tar anropet?)
// ==========================================

// Kostnad = ungefärlig "tid tills hissen kan svara på (floor, dir)".
// Lägre är bättre. Lätt straff på antal pågående stopp för load-balancing.
function hallCost(car, floor, dir) {
  const dist = Math.abs(car.currentFloor - floor);
  const queuePenalty = 0.1 * queueSize(car);

  if (car.direction === 'idle') return dist + queuePenalty;

  // Hissen är på väg och kommer passera (floor) i rätt riktning → idealt
  if (dir === 'up' && car.direction === 'up' && car.currentFloor <= floor) {
    return dist + queuePenalty;
  }
  if (dir === 'down' && car.direction === 'down' && car.currentFloor >= floor) {
    return dist + queuePenalty;
  }

  // Annars måste hissen avsluta sin tur och komma tillbaka — straffa.
  return 2 * totalFloors + dist + queuePenalty;
}

function dispatchHallCall(floor, dir) {
  if (hallAssignments[floor][dir]) return; // redan tilldelad

  const scored = cars.map(car => ({ car, cost: hallCost(car, floor, dir) }));
  scored.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    // Tie-break: idle först, sen mindre kö, sen hiss A
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
// KNAPPLYSSNARE
// ==========================================

// Inre paneler: knapptryck landar enbart i den hissens destinations.
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

// Våningsknappar (hall-anrop): går via dispatchern.
document.querySelectorAll('.floor button[data-direction]').forEach(btn => {
  btn.addEventListener('click', () => {
    const floor = parseInt(btn.dataset.floor);
    const dir = btn.dataset.direction;

    if (hallAssignments[floor][dir]) return; // redan tilldelad

    // Om någon hiss redan står ledig på samma våning, gör inget.
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

// --- Sudda meddelandedisplay ---
btnResetDisplay.addEventListener('click', () => {
  display.innerHTML = '';
});

// --- Initiera båda hissarnas indikatorer ---
cars.forEach(updateFloorIndicator);
