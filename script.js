// DOM-element
const elevator = document.getElementById('elevator');
const display = document.querySelector('.elevator-display');
const btnResetDisplay = document.getElementById('btn-reset-display');
const leftDoor = document.querySelector('.door-left');
const rightDoor = document.querySelector('.door-right');
const floorNumberEl = document.querySelector('.floor-number');
const floorDirectionEl = document.querySelector('.floor-direction');

// Konstanter
const totalFloors = 10;
const floorHeight = 50;

// Hissens tillstånd
let currentFloor = 1;
let direction = 'idle'; // 'up', 'down', 'idle'
let destinations = new Set(); // Valda våningar inifrån hissen
let upCalls = new Set(); // Våningar som kallar uppåt
let downCalls = new Set(); // Våningar som kallar nedåt
let isProcessing = false;

// --- Hjälpfunktioner ---

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateDisplay(message) {
  display.innerHTML = message + '<br>' + display.innerHTML;
}

function updateFloorIndicator() {
  floorNumberEl.textContent = currentFloor;
  if (direction === 'up') floorDirectionEl.textContent = '▲';
  else if (direction === 'down') floorDirectionEl.textContent = '▼';
  else floorDirectionEl.textContent = '–';
}

// --- Dörranimationer ---

function closeDoors() {
  return new Promise(resolve => {
    leftDoor.classList.remove('open');
    rightDoor.classList.remove('open');
    setTimeout(resolve, 1000);
  });
}

function openDoors() {
  return new Promise(resolve => {
    leftDoor.classList.add('open');
    rightDoor.classList.add('open');
    setTimeout(resolve, 1000);
  });
}

// --- Flytta en våning ---

function moveOneFloor(targetFloor) {
  return new Promise(resolve => {
    const targetPos = (targetFloor - 1) * floorHeight;
    elevator.style.transition = 'transform 0.5s linear';
    elevator.style.transform = `translateY(-${targetPos}px)`;
    setTimeout(() => {
      currentFloor = targetFloor;
      updateFloorIndicator();
      resolve();
    }, 500);
  });
}

// --- Kontrollera stopp ---

function hasStopsAbove() {
  for (const f of destinations) if (f > currentFloor) return true;
  for (const f of upCalls) if (f > currentFloor) return true;
  for (const f of downCalls) if (f > currentFloor) return true;
  return false;
}

function hasStopsBelow() {
  for (const f of destinations) if (f < currentFloor) return true;
  for (const f of upCalls) if (f < currentFloor) return true;
  for (const f of downCalls) if (f < currentFloor) return true;
  return false;
}

function hasAnyStops() {
  return destinations.size > 0 || upCalls.size > 0 || downCalls.size > 0;
}

function shouldStopHere() {
  // Stopp om det är en destination inifrån hissen
  if (destinations.has(currentFloor)) return true;
  // Stopp om någon på denna våning vill åka i samma riktning
  if (direction === 'up' && upCalls.has(currentFloor)) return true;
  if (direction === 'down' && downCalls.has(currentFloor)) return true;
  // Vid vändpunkt: plocka upp även motsatt riktning
  if (direction === 'up' && !hasStopsAbove() && downCalls.has(currentFloor)) return true;
  if (direction === 'down' && !hasStopsBelow() && upCalls.has(currentFloor)) return true;
  return false;
}

// Rensa stopp på aktuell våning och uppdatera knappar
function clearStopHere() {
  const floor = currentFloor;

  if (destinations.has(floor)) {
    destinations.delete(floor);
    const btn = document.querySelector(`.panel [data-floor="${floor}"]`);
    if (btn) btn.classList.remove('pushed');
  }

  if (direction === 'up' && upCalls.has(floor)) {
    upCalls.delete(floor);
    const btn = document.querySelector(`.floor [data-floor="${floor}"][data-direction="up"]`);
    if (btn) btn.classList.remove('pushed');
  }

  if (direction === 'down' && downCalls.has(floor)) {
    downCalls.delete(floor);
    const btn = document.querySelector(`.floor [data-floor="${floor}"][data-direction="down"]`);
    if (btn) btn.classList.remove('pushed');
  }

  // Vändpunkt: rensa motsatt riktning också
  if (direction === 'up' && !hasStopsAbove() && downCalls.has(floor)) {
    downCalls.delete(floor);
    const btn = document.querySelector(`.floor [data-floor="${floor}"][data-direction="down"]`);
    if (btn) btn.classList.remove('pushed');
  }
  if (direction === 'down' && !hasStopsBelow() && upCalls.has(floor)) {
    upCalls.delete(floor);
    const btn = document.querySelector(`.floor [data-floor="${floor}"][data-direction="up"]`);
    if (btn) btn.classList.remove('pushed');
  }
}

// --- Stanna på aktuell våning ---

async function stopAtCurrentFloor() {
  clearStopHere();
  updateDisplay('Stannar på våning ' + currentFloor);
  await openDoors();
  await delay(2000);
  if (hasAnyStops()) {
    await closeDoors();
  }
}

// --- Huvudloop för hissen (SCAN-algoritm) ---

async function processElevator() {
  if (isProcessing) return;
  isProcessing = true;

  await closeDoors();

  while (hasAnyStops()) {
    // Uppdatera riktning
    if (direction === 'up' && !hasStopsAbove()) {
      direction = hasStopsBelow() ? 'down' : 'idle';
    } else if (direction === 'down' && !hasStopsBelow()) {
      direction = hasStopsAbove() ? 'up' : 'idle';
    } else if (direction === 'idle') {
      if (hasStopsAbove()) direction = 'up';
      else if (hasStopsBelow()) direction = 'down';
    }

    updateFloorIndicator();

    if (direction === 'idle') break;

    // Kontrollera aktuell våning (t.ex. efter riktningsbyte)
    if (shouldStopHere()) {
      await stopAtCurrentFloor();
      continue;
    }

    // Flytta en våning i aktuell riktning
    const nextFloor = direction === 'up' ? currentFloor + 1 : currentFloor - 1;
    if (nextFloor < 1 || nextFloor > totalFloors) {
      direction = direction === 'up' ? 'down' : 'up';
      continue;
    }

    await moveOneFloor(nextFloor);

    if (shouldStopHere()) {
      await stopAtCurrentFloor();
    }
  }

  // Hissen är ledig
  direction = 'idle';
  updateFloorIndicator();
  leftDoor.classList.add('open');
  rightDoor.classList.add('open');
  isProcessing = false;
}

// --- Knapplyssnare: Inre panel ---

document.querySelectorAll('.panel [data-floor]').forEach(btn => {
  btn.addEventListener('click', () => {
    const floor = parseInt(btn.dataset.floor);

    if (floor === currentFloor && !isProcessing) {
      updateDisplay('Du är redan på våning ' + floor);
      return;
    }
    if (destinations.has(floor)) return;

    destinations.add(floor);
    btn.classList.add('pushed');
    updateDisplay('Våning ' + floor + ' vald i hissen');
    processElevator();
  });
});

// --- Knapplyssnare: Våningsknapparna (upp/ned) ---

document.querySelectorAll('.floor [data-direction]').forEach(btn => {
  btn.addEventListener('click', () => {
    const floor = parseInt(btn.dataset.floor);
    const dir = btn.dataset.direction;

    if (floor === currentFloor && !isProcessing) {
      updateDisplay('Hissen är redan på våning ' + floor);
      return;
    }

    const callSet = dir === 'up' ? upCalls : downCalls;
    if (callSet.has(floor)) return;

    callSet.add(floor);
    btn.classList.add('pushed');
    updateDisplay('Våning ' + floor + ' kallar (' + (dir === 'up' ? '▲' : '▼') + ')');
    processElevator();
  });
});

// --- Sudda display ---

btnResetDisplay.addEventListener('click', () => {
  display.innerHTML = '';
});

// --- Initiera ---
updateFloorIndicator();
